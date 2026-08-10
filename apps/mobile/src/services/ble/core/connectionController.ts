/**
 * BLE 连接编排：收敛「停扫 / 断旧 / 连接 / 持久化配对 / 开启监控」流程，
 * 让 UI 层只做展示与动作触发，不再直接操作 manager / store。
 */
import { bleDeviceManager } from './manager';
import { bleLog } from './logger';
import { savePairedDevice } from '../storage/pairedDevices';
import type { PairedBleDevice } from '../storage/pairedDevices';
import type { BleDevice } from '../types';

export type ConnectResult = {
  pairedDevices: PairedBleDevice[];
  /** 连接成功后开启设备监控失败的原始错误（连接本身仍有效） */
  watchError?: unknown;
};

export const bleConnectionController = {
  async startScan(onDeviceFound: (device: BleDevice) => void): Promise<void> {
    await bleDeviceManager.startScan(onDeviceFound);
  },

  stopScan(): void {
    bleDeviceManager.stopScan();
  },

  /** 连接设备：停扫 → 断开当前设备 → 连接 → 持久化配对 → 开启监控 */
  async connect(device: BleDevice): Promise<ConnectResult> {
    const manager = bleDeviceManager;

    if (manager.isScanning()) {
      manager.stopScan();
    }

    if (manager.isConnected()) {
      await manager.disconnect().catch(() => undefined);
    }

    await manager.connect(device.id);

    const pairedDevices = await savePairedDevice(device);

    let watchError: unknown;
    try {
      await manager.startDeviceWatch();
    } catch (error) {
      watchError = error;
      bleLog.warn(
        '设备监控开启失败',
        error instanceof Error ? error.message : error,
      );
    }

    return { pairedDevices, watchError };
  },

  /** 断开当前设备（先停监控再断开） */
  async disconnect(): Promise<void> {
    const manager = bleDeviceManager;
    if (!manager.isConnected()) {
      return;
    }

    try {
      await manager.stopDeviceWatch();
    } catch {
      // 监控可能未开启或连接已不稳定，继续尝试断开
    }
    await manager.disconnect();
  },
};