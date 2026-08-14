import { create } from 'zustand';
import type { State } from 'react-native-ble-plx';

import type {
  BleDevice,
  DeviceWatchPayload,
  PairedBleDevice,
} from '../services/ble';
export type BleConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * BLE 状态 store：连接相位机 + 配对设备持久化的只读投影。
 * 唯一写入入口是 applySnapshot（实际调用方为 BleStoreBootstrap）。
 * UI 不得直接改写连接状态，只能通过 services/ble 的动作触发。
 */
export type BleStoreSnapshot = {
  bluetoothState: State | null;
  connectionStatus: BleConnectionStatus;
  connectedDevice: BleDevice | null;
  /** 扫描活动标志（投影自相位机） */
  isScanning: boolean;
  deviceWatch: DeviceWatchPayload | null;
  /** 已配对设备列表（投影自 pairedDevices 持久化） */
  pairedDevices: PairedBleDevice[];
};

type BleStore = BleStoreSnapshot & {
  applySnapshot: (partial: Partial<BleStoreSnapshot>) => void;
};

export const useBleStore = create<BleStore>(set => ({
  bluetoothState: null,
  connectionStatus: 'disconnected',
  connectedDevice: null,
  isScanning: false,
  deviceWatch: null,
  pairedDevices: [],
  applySnapshot: partial => set(partial),
}));
