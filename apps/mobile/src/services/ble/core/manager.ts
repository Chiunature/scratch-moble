import {
  Device,
  type BleManager,
  type Characteristic,
  type State,
} from 'react-native-ble-plx';

import {
  BLE_FILE_LIST_DELAY_MS,
  BLE_REQUEST_MTU,
  TARGET_DEVICE_NAME,
} from '../../../constants/bleCommand';
import {
  BLE_SIGN,
  CHARACTERISTIC_UUID,
  COMMANDS,
  FUNCTION_CODES,
  SERVICE_UUID,
  base64ToBytes,
  buildCommand,
  buildMatrixCommand,
  buildMotorCommand,
  bytesToBase64,
  catchData,
  checkFileName,
  consumeFrame,
  decodeFileListPayload,
  delay,
  distinguishDevice,
  drainDeviceWatchJsonBuffer,
  hexToString,
  parseDeviceData,
  readHostWillAiState,
  stringToHex,
  type BleSign,
  type DeviceWatchPayload,
  type MatrixControlPayload,
  type MotorControlPayload,
  type ParsedFrame,
} from '@scratch-mobile/protocol';
import { bleLog, isBleDisconnectError } from './logger';
import { isDeviceWatchDebugEnabled } from './debug';
import { ConnectionPhaseMachine, type BleConnectionPhase } from './phaseMachine';
import { requestBlePermissions } from './permissions';
import { getSharedBleManager } from './singleton';
import { UploadSession } from './uploadSession';
import type {
  BleDevice,
  DeleteFileOptions,
  UploadFileOptions,
} from '../types';

const DEVICE_WATCH_THROTTLE_MS = 100;

function normalizeUuid(uuid: string): string {
  return uuid.toLowerCase().replace(/-/g, '');
}

function getDeviceDisplayName(device: Device): string {
  return device.localName ?? device.name ?? 'unknown';
}

export class BleDeviceManager {
  private bleManager: BleManager | null = null;
  /** 连接相位机：唯一事实源，store 经 onPhaseChange 投影 */
  private readonly machine = new ConnectionPhaseMachine();
  private connectedDevice: Device | null = null;
  private characteristic: Characteristic | null = null;
  private isDeviceScanning = false;

  private sign: BleSign = null;
  private binaryReceiveBuffer: number[] = [];
  private textReceiveBuffer = '';

  /**
   * 上传会话：帧队列 / 进度 / 结算 / 定时器全部收归 uploadSession，
   * manager 只做薄委托（GATT 写入原语与相位转换仍由 manager 提供）。
   */
  private readonly uploadSession = new UploadSession({
    writeUploadFrame: command => this.writeUploadFrame(command),
    transition: phase => {
      if (phase === 'uploading') {
        this.machine.transition('uploading');
      } else if (this.connectedDevice) {
        this.machine.transition('connected');
      }
    },
    resetBootSign: () => {
      this.sign = null;
    },
  });

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

  /** 解析共享 BleManager（destroySharedBleManager 后可重建，不能持有过期实例） */
  private resolveManager(): BleManager {
    this.bleManager = getSharedBleManager();
    return this.bleManager;
  }

  getManager() {
    return this.resolveManager();
  }

  getPhase() {
    return this.machine.getPhase();
  }

  /** 订阅连接相位变化（store 投影用）；返回退订函数 */
  onPhaseChange(listener: (phase: BleConnectionPhase) => void): () => void {
    return this.machine.onPhaseChange(listener);
  }

  isScanning(): boolean {
    return this.isDeviceScanning;
  }

  /** 当前已连接设备的展示信息（store 投影用） */
  getConnectedDevice(): BleDevice | null {
    if (!this.connectedDevice) {
      return null;
    }
    return {
      id: this.connectedDevice.id,
      name: getDeviceDisplayName(this.connectedDevice),
      rssi: this.connectedDevice.rssi ?? null,
    };
  }

  setDeviceStatusCallback(
    callback: ((status: DeviceWatchPayload) => void) | null,
  ): void {
    this.onDeviceStatusCallback = callback;
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  /**
   * 普通命令写入。上传帧请用 writeUploadFrame（业务 ACK 靠 Notify，不绑 GATT Write Response）。
   */
  private async writeFrame(command: number[], sign: BleSign): Promise<void> {
    if (!this.characteristic) {
      throw new Error('设备未连接');
    }

    if (sign !== null) {
      this.sign = sign;
    }

    if (this.characteristic.writeWithoutResponse) {
      bleLog.tx('writeWithoutResponse', command);
      await this.characteristic.writeWithoutResponse(bytesToBase64(command));
    } else if (this.characteristic.writeWithResponse) {
      bleLog.tx('writeWithResponse', command);
      await Promise.race([
        this.characteristic.writeWithResponse(bytesToBase64(command)),
        delay(500),
      ]).catch(() => undefined);
    } else {
      throw new Error('Characteristic 不支持任何写入操作');
    }
  }

  /**
   * 上传专用写入，对应 EST-link bleWrite(data, Boot_Bin)。
   * EST-link 在 Noble 侧 write(withResponse) 但不等业务 GATT 回执；真正停等在 Notify ACK。
   * Android 上大帧 writeWithResponse 易失败，故优先 writeWithoutResponse。
   */
  private async writeUploadFrame(command: number[]): Promise<void> {
    if (!this.characteristic) {
      throw new Error('设备未连接');
    }

    this.sign = BLE_SIGN.BOOT_BIN;
    const payload = bytesToBase64(command);

    if (this.characteristic.writeWithoutResponse) {
      bleLog.tx('writeWithoutResponse upload', command);
      await this.characteristic.writeWithoutResponse(payload);
      return;
    }

    if (this.characteristic.writeWithResponse) {
      bleLog.tx('writeWithResponse upload', command);
      try {
        await this.characteristic.writeWithResponse(payload);
      } catch (error) {
        bleLog.warn(
          'upload GATT writeWithResponse 异常，继续等待 Notify ACK',
          error,
        );
      }
      return;
    }

    throw new Error('Characteristic 不支持任何写入操作');
  }

  async sendCommand(command: number[]): Promise<void> {
    await this.writeFrame(command, null);
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
    this.sign = BLE_SIGN.BOOT_BIN;
    return this.uploadSession.start(options);
  }

  async deleteFile({
    fileName,
    functionCode = FUNCTION_CODES.DELETE,
  }: DeleteFileOptions): Promise<void> {
    bleLog.info('删除文件', fileName);
    await this.sendCommand(checkFileName(fileName, functionCode));
  }

  async connect(deviceId: string): Promise<void> {
    if (this.isDeviceScanning) {
      this.stopScan();
    }

    bleLog.info('连接设备', deviceId);

    // 前置校验先做，通过后才进入 connecting（避免失败路径残留在 connecting 态）
    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      throw new Error('蓝牙权限未授予');
    }

    const state = await this.resolveManager().state();
    if (state !== 'PoweredOn') {
      throw new Error(`蓝牙未开启（${state}）`);
    }

    this.machine.transition('connecting');
    let connectedDevice: Device | null = null;

    try {
      this.disconnectHandled = false;
      connectedDevice = await this.resolveManager().connectToDevice(deviceId, {
        requestMTU: BLE_REQUEST_MTU,
      });
      this.connectedDevice = connectedDevice;
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

      this.machine.transition('connected');
      bleLog.info('蓝牙连接成功', deviceId);
    } catch (error) {
      const connectedDeviceId = connectedDevice?.id ?? this.connectedDevice?.id;
      this.disconnectHandled = true;
      this.connectedDevice = null;
      this.characteristic = null;
      this.resetReceiveBuffers();
      this.clearWatchThrottle();

      if (connectedDeviceId) {
        try {
          await this.resolveManager().cancelDeviceConnection(connectedDeviceId);
        } catch (disconnectError) {
          if (!isBleDisconnectError(disconnectError)) {
            bleLog.warn('连接失败后断开设备失败', disconnectError);
          }
        }
      }

      this.machine.transition('disconnected');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connectedDevice) {
      return;
    }

    const deviceId = this.connectedDevice.id;
    bleLog.info('主动断开连接', deviceId);

    try {
      await this.resolveManager().cancelDeviceConnection(deviceId);
      // 部分平台 cancel 成功但不回调 onDisconnected，显式收尾（disconnectHandled 防重入）
      this.handleDisconnected('主动断开');
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

    const state = await this.resolveManager().state();
    if (state !== 'PoweredOn') {
      throw new Error(`蓝牙未开启（${state}）`);
    }

    bleLog.info('开始扫描', TARGET_DEVICE_NAME);
    this.isDeviceScanning = true;
    this.machine.transition('scanning');
    this.resolveManager().startDeviceScan(null, null, (error, device) => {
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
    this.resolveManager().stopDeviceScan();
    this.isDeviceScanning = false;
    // 已连接时停扫回 connected（切换设备场景：连接保留）；否则回 idle
    this.machine.transition(this.connectedDevice ? 'connected' : 'idle');
  }

  /** 系统蓝牙开关变化（PoweredOff 等） */
  onBluetoothAdapterStateChanged(state: State): void {
    if (state === 'PoweredOn') {
      return;
    }

    bleLog.info('系统蓝牙不可用，停止扫描并清理连接', state);

    try {
      this.resolveManager().stopDeviceScan();
    } catch {
      // 适配器已关闭时 stopDeviceScan 可能失败，仍重置本地扫描状态
    }
    this.isDeviceScanning = false;

    if (this.connectedDevice) {
      this.handleDisconnected(
        state === 'PoweredOff' ? '蓝牙已关闭' : `蓝牙不可用（${state}）`,
      );
      return;
    }

    if (this.machine.getPhase() === 'scanning') {
      this.machine.transition('idle');
    }
  }

  destroy(): void {
    bleLog.info('销毁 BleDeviceManager');
    this.stopScan();
    this.uploadSession.cancel(new Error('bleManagerDestroyed'));
    this.clearPendingBinary(new Error('bleManagerDestroyed'));
    this.clearWatchThrottle();
    void this.disconnect();
    this.machine.transition('disconnected');
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
    if (isDeviceWatchDebugEnabled()) {
      bleLog.info(
        `Notify ${bytes.length} bytes`,
        this.isBinaryMode() ? '(binary mode)' : '(text mode)',
      );
    }

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
      this.uploadSession.isActive()
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

    if (this.sign === BLE_SIGN.BOOT_BIN && this.uploadSession.isActive()) {
      this.uploadSession.handleAck(frame.data);
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

      if (!isDeviceWatchDebugEnabled()) {
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
    if (isDeviceWatchDebugEnabled()) {
      bleLog.info(
        'deviceWatch WillAiState:',
        readHostWillAiState(distinguished) ?? '(undefined)',
      );
      try {
        bleLog.info('deviceWatch data', JSON.stringify(distinguished));
      } catch {
        bleLog.info('deviceWatch data', distinguished);
      }
    }
    this.onDeviceStatusCallback?.(distinguished);
  }

  private clearWatchThrottle(): void {
    if (this.watchThrottleTimer) {
      clearTimeout(this.watchThrottleTimer);
      this.watchThrottleTimer = null;
    }
    this.pendingWatchPayload = null;
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

    // 已连接时扫描中被动断开：同步停扫，避免残留扫描态
    if (this.isDeviceScanning) {
      try {
        this.resolveManager().stopDeviceScan();
      } catch {
        // 适配器已异常时忽略
      }
      this.isDeviceScanning = false;
    }

    const deviceId = this.connectedDevice?.id;
    bleLog.info('连接已结束', reason, deviceId ?? '');

    this.connectedDevice = null;
    this.characteristic = null;
    this.resetReceiveBuffers();
    this.clearWatchThrottle();
    this.uploadSession.cancel(new Error('deviceDisconnected'));
    this.clearPendingBinary(new Error('deviceDisconnected'));
    this.machine.transition('disconnected');
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

export type {
  BleDevice,
  DeleteFileOptions,
  MatrixControlPayload,
  MotorControlPayload,
  UploadFileOptions,
  UploadProgress,
  WatchDeviceItem,
} from '../types';

export type { DeviceWatchPayload } from '@scratch-mobile/protocol';

export { BLE_SIGN } from '@scratch-mobile/protocol';
