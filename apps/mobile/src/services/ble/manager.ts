import { Device, type Characteristic, type State } from 'react-native-ble-plx';

import {
  BLE_FILE_LIST_DELAY_MS,
  BLE_UPLOAD_CHUNK_SIZE,
  BLE_UPLOAD_TIMEOUT_MS,
  COMMANDS,
  CHARACTERISTIC_UUID,
  FUNCTION_CODES,
  SERVICE_UUID,
  TARGET_DEVICE_NAME,
} from '../../constants/bleCommand';
import { BLE_SIGN, type BleSign } from '../../constants/bleSign';
import {
  distinguishDevice,
  drainDeviceWatchJsonBuffer,
  parseDeviceData,
  type DeviceWatchPayload,
} from '../../utils/bleDeviceParser';
import {
  buildMatrixCommand,
  buildMotorCommand,
  type MatrixControlPayload,
  type MotorControlPayload,
} from '../../utils/bleRemoteControl';
import {
  base64ToBytes,
  buildCommand,
  buildUploadFrames,
  bytesToBase64,
  catchData,
  checkFileName,
  consumeFrame,
  decodeFileListPayload,
  delay,
  hexToString,
  stringToHex,
  verifyBootFrame,
  type ParsedFrame,
} from '../../utils/bleProtocol';
import { bleLog, isBleDisconnectError } from './logger';
import { requestBlePermissions } from './permissions';
import { getSharedBleManager } from './singleton';
import type {
  BleDevice,
  DeleteFileOptions,
  UploadFileOptions,
  UploadProgress,
} from './types';

const DEVICE_WATCH_THROTTLE_MS = 100;

function normalizeUuid(uuid: string): string {
  return uuid.toLowerCase().replace(/-/g, '');
}

function getDeviceDisplayName(device: Device): string {
  return device.localName ?? device.name ?? 'unknown';
}

export class BleDeviceManager {
  private bleManager = getSharedBleManager();
  private connectedDevice: Device | null = null;
  private characteristic: Characteristic | null = null;
  private isDeviceScanning = false;
  private disconnectCallback: (() => void) | null = null;

  private sign: BleSign = null;
  private binaryReceiveBuffer: number[] = [];
  private textReceiveBuffer = '';

  private uploadFrames: number[][] = [];
  private uploadFrameIndex = 0;
  private uploadTotalFrames = 0;
  private uploadFileName = '';
  private uploadOnProgress: ((progress: UploadProgress) => void) | null = null;
  private uploadResolve: (() => void) | null = null;
  private uploadReject: ((error: Error) => void) | null = null;
  private uploadTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private pendingBinaryResolve: ((value: string) => void) | null = null;
  private pendingBinaryReject: ((error: Error) => void) | null = null;
  private pendingBinaryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private onDeviceStatusCallback:
    | ((status: DeviceWatchPayload) => void)
    | null = null;

  private lastWatchEmitAt = 0;
  private pendingWatchPayload: DeviceWatchPayload | null = null;
  private watchThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectHandled = false;

  getManager() {
    return this.bleManager;
  }

  setDeviceStatusCallback(
    callback: ((status: DeviceWatchPayload) => void) | null,
  ): void {
    this.onDeviceStatusCallback = callback;
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  async sendCommand(command: number[]): Promise<void> {
    if (!this.characteristic) {
      throw new Error('设备未连接');
    }

    // 检查是否支持 writeWithoutResponse
    if (this.characteristic.writeWithoutResponse) {
      bleLog.tx('writeWithoutResponse', command);
      await this.characteristic.writeWithoutResponse(bytesToBase64(command));
    } else if (this.characteristic.writeWithResponse) {
      bleLog.tx('writeWithResponse', command);
      await Promise.race([
        this.characteristic.writeWithResponse(bytesToBase64(command)),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('设备无响应（符合预期）')), 500),
        ),
      ]).catch(() => undefined);
    } else {
      throw new Error('Characteristic 不支持任何写入操作');
    }
  }

  async sendData(data: number[], cmd: number): Promise<void> {
    await this.sendCommand(buildCommand(data, cmd));
  }

  async sendString(str: string, cmd: number): Promise<void> {
    await this.sendData(stringToHex(str), cmd);
  }

  async runApp(run: boolean): Promise<void> {
    await this.sendCommand([...(run ? COMMANDS.app_run : COMMANDS.app_stop)]);
  }

  async restart(): Promise<void> {
    await this.sendCommand([...COMMANDS.restart]);
  }

  /** 开启设备 JSON 监控（电脑端 SENSING_UPDATE） */
  async startDeviceWatch(): Promise<void> {
    await this.sendCommand([...COMMANDS.sensing_update]);
  }

  /** 停止设备 JSON 监控 */
  async stopDeviceWatch(): Promise<void> {
    await this.sendCommand([...COMMANDS.stop_watch]);
  }

  /** 清空矩阵灯 */
  async clearMatrix(): Promise<void> {
    await this.sendCommand([...COMMANDS.matrix_clear]);
  }

  /** 电机控制（电脑端 motorChange） */
  async sendMotorCommand(payload: MotorControlPayload): Promise<void> {
    const frame = buildMotorCommand(payload);
    if (!frame) {
      throw new Error(`无效的电机指令: ${payload.type}`);
    }
    bleLog.info('发送电机指令', payload.type);
    await this.sendCommand(frame);
  }

  /** 矩阵灯控制（电脑端 matrixChange） */
  async sendMatrixCommand(payload: MatrixControlPayload): Promise<void> {
    const frame = buildMatrixCommand(payload);
    if (!frame) {
      throw new Error(`无效的矩阵灯指令: ${payload.type}`);
    }
    bleLog.info('发送矩阵灯指令', payload.type);
    await this.sendCommand(frame);
  }

  async updateSensing(dataList: number[]): Promise<void> {
    bleLog.info('更新传感器端口映射', dataList);
    let sum = 0x5a + 0x97 + 0x98 + 0x08 + 0x32;
    dataList.forEach(el => {
      sum += el;
    });
    const frame = [0x5a, 0x97, 0x98, 0x08, 0x32, ...dataList, sum & 0xff, 0xa5];
    await this.sendCommand(frame);
  }

  async getFileList(timeoutMs = 10000): Promise<string> {
    if (this.pendingBinaryResolve) {
      throw new Error('已有进行中的蓝牙请求');
    }

    bleLog.info('获取文件列表');

    return new Promise((resolve, reject) => {
      this.pendingBinaryResolve = resolve;
      this.pendingBinaryReject = reject;
      this.sign = BLE_SIGN.EXE_FILES;
      this.pendingBinaryTimeoutId = setTimeout(() => {
        bleLog.warn('获取文件列表超时');
        this.clearPendingBinary(new Error('getFileListTimeout'));
      }, timeoutMs);

      void (async () => {
        try {
          await this.sendCommand([...COMMANDS.stop_watch]);
          await delay(BLE_FILE_LIST_DELAY_MS);
          await this.sendCommand([...COMMANDS.files]);
        } catch (error) {
          this.clearPendingBinary(
            error instanceof Error ? error : new Error('getFileListFailed'),
          );
        }
      })();
    });
  }

  async uploadFile(options: UploadFileOptions): Promise<void> {
    if (this.uploadResolve) {
      throw new Error('已有进行中的上传任务');
    }

    const {
      fileName,
      fileData,
      functionCode = FUNCTION_CODES.FILE_NAME,
      chunkSize = BLE_UPLOAD_CHUNK_SIZE,
      runAfterUpload = false,
      onProgress,
    } = options;

    bleLog.info('开始上传文件', {
      fileName,
      bytes: fileData.length,
      chunkSize,
      runAfterUpload,
    });

    this.uploadFrames = buildUploadFrames(
      fileName,
      fileData,
      functionCode,
      chunkSize,
      runAfterUpload,
    );
    this.uploadTotalFrames = this.uploadFrames.length;
    this.uploadFileName = fileName;
    this.uploadOnProgress = onProgress ?? null;
    this.sign = BLE_SIGN.BOOT_BIN;

    bleLog.info(`上传分包数: ${this.uploadTotalFrames}`);

    return new Promise((resolve, reject) => {
      this.uploadResolve = resolve;
      this.uploadReject = reject;
      void this.sendUploadFrameAt(0);
    });
  }

  async deleteFile({
    fileName,
    functionCode = FUNCTION_CODES.DELETE,
  }: DeleteFileOptions): Promise<void> {
    bleLog.info('删除文件', fileName);
    await this.sendCommand(checkFileName(fileName, functionCode));
  }

  async connect(deviceId: string, onDisconnected?: () => void): Promise<void> {
    if (this.isDeviceScanning) {
      this.stopScan();
    }

    bleLog.info('连接设备', deviceId);

    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      throw new Error('蓝牙权限未授予');
    }

    const state = await this.bleManager.state();
    if (state !== 'PoweredOn') {
      throw new Error(`蓝牙未开启（${state}）`);
    }

    this.disconnectCallback = onDisconnected ?? null;
    this.disconnectHandled = false;
    this.connectedDevice = await this.bleManager.connectToDevice(deviceId);
    await this.connectedDevice.discoverAllServicesAndCharacteristics();

    const services = await this.connectedDevice.services();
    const targetService = services.find(
      s => normalizeUuid(s.uuid) === normalizeUuid(SERVICE_UUID),
    );
    if (!targetService) {
      throw new Error(`未找到服务: ${SERVICE_UUID}`);
    }

    const characteristics = await targetService.characteristics();
    const targetCharacteristic = characteristics.find(
      c => normalizeUuid(c.uuid) === normalizeUuid(CHARACTERISTIC_UUID),
    );
    if (!targetCharacteristic) {
      throw new Error(`未找到特征值: ${CHARACTERISTIC_UUID}`);
    }

    this.characteristic = targetCharacteristic;
    this.resetReceiveBuffers();
    this.subscribeToNotifications();

    this.connectedDevice.onDisconnected(() => {
      this.handleDisconnected('设备断开');
    });

    bleLog.info('蓝牙连接成功', deviceId);
  }

  async disconnect(): Promise<void> {
    if (!this.connectedDevice) {
      return;
    }

    const deviceId = this.connectedDevice.id;
    bleLog.info('主动断开连接', deviceId);

    try {
      await this.bleManager.cancelDeviceConnection(deviceId);
    } catch (error) {
      if (isBleDisconnectError(error)) {
        this.handleDisconnected('主动断开');
        return;
      }
      throw error;
    }
  }

  async startScan(onDeviceFound: (device: BleDevice) => void): Promise<void> {
    if (this.isDeviceScanning) {
      return;
    }

    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      throw new Error('蓝牙权限未授予');
    }

    const state = await this.bleManager.state();
    if (state !== 'PoweredOn') {
      throw new Error(`蓝牙未开启（${state}）`);
    }

    bleLog.info('开始扫描', TARGET_DEVICE_NAME);
    this.isDeviceScanning = true;
    this.bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        bleLog.warn('扫描错误', error.message);
        return;
      }

      if (!device) {
        return;
      }

      const name = getDeviceDisplayName(device);
      if (name !== TARGET_DEVICE_NAME) {
        return;
      }

      bleLog.debug('发现设备', { id: device.id, name, rssi: device.rssi });
      onDeviceFound({
        id: device.id,
        name,
        rssi: device.rssi,
      });
    });
  }

  stopScan(): void {
    if (!this.isDeviceScanning) {
      return;
    }

    bleLog.info('停止扫描');
    this.bleManager.stopDeviceScan();
    this.isDeviceScanning = false;
  }

  /** 系统蓝牙开关变化（PoweredOff 等） */
  onBluetoothAdapterStateChanged(state: State): void {
    if (state === 'PoweredOn') {
      return;
    }

    bleLog.info('系统蓝牙不可用，停止扫描并清理连接', state);

    try {
      this.bleManager.stopDeviceScan();
    } catch {
      // 适配器已关闭时 stopDeviceScan 可能失败，仍重置本地扫描状态
    }
    this.isDeviceScanning = false;

    if (this.connectedDevice) {
      this.handleDisconnected(
        state === 'PoweredOff' ? '蓝牙已关闭' : `蓝牙不可用（${state}）`,
      );
    }
  }

  destroy(): void {
    bleLog.info('销毁 BleDeviceManager');
    this.stopScan();
    this.cancelUpload(new Error('bleManagerDestroyed'));
    this.clearPendingBinary(new Error('bleManagerDestroyed'));
    this.clearWatchThrottle();
    void this.disconnect();
  }

  private subscribeToNotifications(): void {
    if (!this.characteristic) {
      return;
    }

    this.characteristic.monitor((error, characteristic) => {
      if (error) {
        if (isBleDisconnectError(error)) {
          return;
        }
        bleLog.error('通知监听错误', error);
        return;
      }

      if (!characteristic?.value) {
        return;
      }

      const bytes = base64ToBytes(characteristic.value);
      this.processReceivedData(bytes);
    });
  }

  private processReceivedData(bytes: number[]): void {
    if (this.isBinaryMode()) {
      this.processBinaryData(bytes);
      return;
    }

    this.processTextData(bytes);
  }

  private isBinaryMode(): boolean {
    return (
      this.sign === BLE_SIGN.BOOT_BIN ||
      this.sign === BLE_SIGN.EXE_FILES ||
      this.uploadResolve !== null
    );
  }

  private processBinaryData(bytes: number[]): void {
    this.binaryReceiveBuffer.push(...bytes);

    let frame = catchData(this.binaryReceiveBuffer);
    while (frame) {
      consumeFrame(this.binaryReceiveBuffer, frame);
      bleLog.rx('binaryFrame', {
        bit: `0x${frame.bit.toString(16)}`,
        length: frame.frameLength,
        dataHex: bleLog.formatBytesHex(frame.data, 64),
      });
      this.handleBinaryFrame(frame);
      frame = catchData(this.binaryReceiveBuffer);
    }
  }

  private handleBinaryFrame(frame: ParsedFrame): void {
    if (this.sign === BLE_SIGN.EXE_FILES) {
      if (frame.bit === FUNCTION_CODES.FILE_LIST_RESPONSE) {
        const fileList = decodeFileListPayload(frame.data);
        bleLog.info('收到文件列表', fileList);
        this.clearPendingBinary(undefined, fileList);
      }
      return;
    }

    if (this.sign === BLE_SIGN.BOOT_BIN && this.uploadResolve) {
      if (!verifyBootFrame(frame.data)) {
        bleLog.error('上传 ACK 校验失败');
        this.cancelUpload(new Error('uploadError'));
        return;
      }

      this.clearUploadTimeout();
      const nextIndex = this.uploadFrameIndex + 1;
      const progress = Math.ceil((nextIndex / this.uploadTotalFrames) * 100);
      bleLog.info(
        `上传进度 ${progress}% (${nextIndex}/${this.uploadTotalFrames})`,
      );
      this.uploadOnProgress?.({
        fileName: this.uploadFileName,
        progress,
      });

      if (nextIndex >= this.uploadTotalFrames) {
        bleLog.info('上传完成', this.uploadFileName);
        this.finishUpload();
        return;
      }

      void this.sendUploadFrameAt(nextIndex);
    }
  }

  private processTextData(bytes: number[]): void {
    this.textReceiveBuffer += hexToString(bytes);

    const { remainder, packets } = drainDeviceWatchJsonBuffer(
      this.textReceiveBuffer,
    );
    this.textReceiveBuffer = remainder;

    for (const packet of packets) {
      const parsed = parseDeviceData(packet);
      if (parsed) {
        this.scheduleDeviceWatch(parsed);
        continue;
      }

      bleLog.warn(
        '无法解析为 deviceWatch JSON',
        packet.length > 120 ? `${packet.slice(0, 120)}...` : packet,
      );
    }
  }

  /** 对应电脑端 throttle(watchDevice, 100) */
  private scheduleDeviceWatch(payload: DeviceWatchPayload): void {
    this.pendingWatchPayload = payload;
    const now = Date.now();

    if (now - this.lastWatchEmitAt >= DEVICE_WATCH_THROTTLE_MS) {
      this.lastWatchEmitAt = now;
      this.pendingWatchPayload = null;
      this.emitDeviceWatch(payload);
      return;
    }

    if (!this.watchThrottleTimer) {
      this.watchThrottleTimer = setTimeout(() => {
        this.watchThrottleTimer = null;
        if (this.pendingWatchPayload) {
          this.lastWatchEmitAt = Date.now();
          this.emitDeviceWatch(this.pendingWatchPayload);
          this.pendingWatchPayload = null;
        }
      }, DEVICE_WATCH_THROTTLE_MS);
    }
  }

  private emitDeviceWatch(payload: DeviceWatchPayload): void {
    const distinguished = distinguishDevice(payload);
    bleLog.debug('deviceWatch', distinguished.deviceList.length, 'ports');
    this.onDeviceStatusCallback?.(distinguished);
  }

  private clearWatchThrottle(): void {
    if (this.watchThrottleTimer) {
      clearTimeout(this.watchThrottleTimer);
      this.watchThrottleTimer = null;
    }
    this.pendingWatchPayload = null;
  }

  private async sendUploadFrameAt(index: number): Promise<void> {
    this.uploadFrameIndex = index;
    this.resetUploadTimeout();
    bleLog.info(`上传分包 ${index + 1}/${this.uploadTotalFrames}`);

    try {
      await this.sendCommand(this.uploadFrames[index]);
    } catch (error) {
      bleLog.error('上传分包发送失败', error);
      this.cancelUpload(
        error instanceof Error ? error : new Error('uploadError'),
      );
    }
  }

  private resetUploadTimeout(): void {
    this.clearUploadTimeout();
    this.uploadTimeoutId = setTimeout(() => {
      bleLog.warn('上传超时');
      this.cancelUpload(new Error('uploadTimeout'));
    }, BLE_UPLOAD_TIMEOUT_MS);
  }

  private clearUploadTimeout(): void {
    if (this.uploadTimeoutId) {
      clearTimeout(this.uploadTimeoutId);
      this.uploadTimeoutId = null;
    }
  }

  private finishUpload(): void {
    this.clearUploadTimeout();
    this.sign = null;
    this.uploadFrames = [];
    this.uploadOnProgress = null;
    const resolve = this.uploadResolve;
    this.uploadResolve = null;
    this.uploadReject = null;
    resolve?.();
  }

  private cancelUpload(error: Error): void {
    const hadActiveUpload = this.uploadReject !== null;
    this.clearUploadTimeout();
    this.sign = null;
    this.uploadFrames = [];
    this.uploadOnProgress = null;
    const reject = this.uploadReject;
    this.uploadResolve = null;
    this.uploadReject = null;

    if (!hadActiveUpload) {
      return;
    }

    if (error.message === 'deviceDisconnected') {
      bleLog.info('上传因断开而中断');
    } else {
      bleLog.warn('上传取消', error.message);
    }
    reject?.(error);
  }

  private clearPendingBinary(error?: Error, result?: string): void {
    if (this.pendingBinaryTimeoutId) {
      clearTimeout(this.pendingBinaryTimeoutId);
      this.pendingBinaryTimeoutId = null;
    }

    this.sign = null;
    const resolve = this.pendingBinaryResolve;
    const reject = this.pendingBinaryReject;
    const hadPendingRequest = reject !== null;
    this.pendingBinaryResolve = null;
    this.pendingBinaryReject = null;

    if (error) {
      if (!hadPendingRequest) {
        return;
      }
      if (error.message === 'deviceDisconnected') {
        bleLog.info('蓝牙请求因断开而中断');
      } else {
        bleLog.warn('二进制请求失败', error.message);
      }
      reject?.(error);
      return;
    }

    if (result !== undefined) {
      resolve?.(result);
    }
  }

  private resetReceiveBuffers(): void {
    this.binaryReceiveBuffer = [];
    this.textReceiveBuffer = '';
  }

  private handleDisconnected(reason: string): void {
    if (this.disconnectHandled) {
      return;
    }
    this.disconnectHandled = true;

    const deviceId = this.connectedDevice?.id;
    bleLog.info('连接已结束', reason, deviceId ?? '');

    this.connectedDevice = null;
    this.characteristic = null;
    this.resetReceiveBuffers();
    this.clearWatchThrottle();
    this.cancelUpload(new Error('deviceDisconnected'));
    this.clearPendingBinary(new Error('deviceDisconnected'));
    this.disconnectCallback?.();
    this.disconnectCallback = null;
  }
}

export const bleDeviceManager = new BleDeviceManager();

export function subscribeBluetoothState(
  onStateChange: (state: State) => void,
): () => void {
  const subscription = getSharedBleManager().onStateChange(state => {
    bleLog.debug('蓝牙状态变化', state);
    onStateChange(state);
  }, true);
  return () => subscription.remove();
}

export async function startScan(
  onDeviceFound: (device: BleDevice) => void,
): Promise<void> {
  await bleDeviceManager.startScan(onDeviceFound);
}

export function stopScan(): void {
  bleDeviceManager.stopScan();
}

export type {
  BleDevice,
  DeleteFileOptions,
  MatrixControlPayload,
  MotorControlPayload,
  UploadFileOptions,
  UploadProgress,
  WatchDeviceItem,
} from './types';

export type { DeviceWatchPayload } from '../../utils/bleDeviceParser';

export { BLE_SIGN } from '../../constants/bleSign';
