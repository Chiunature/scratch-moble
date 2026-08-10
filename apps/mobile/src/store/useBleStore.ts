import { create } from 'zustand';
import type { State } from 'react-native-ble-plx';

import type { BleDevice, DeviceWatchPayload } from '../services/ble';

export type BleConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * BLE 状态 store：连接相位机的投影（唯一写入方是 BleStoreBootstrap）。
 * UI 不得直接改写连接状态，只能通过 services/ble 的动作触发。
 */
type BleStore = {
  bluetoothState: State | null;
  connectionStatus: BleConnectionStatus;
  connectedDevice: BleDevice | null;
  /** 扫描活动标志（投影自相位机） */
  isScanning: boolean;
  deviceWatch: DeviceWatchPayload | null;

  setBluetoothState: (state: State) => void;
  setConnectionStatus: (status: BleConnectionStatus) => void;
  setConnectedDevice: (device: BleDevice | null) => void;
  setScanning: (scanning: boolean) => void;
  setDeviceWatch: (payload: DeviceWatchPayload) => void;
  clearDeviceWatch: () => void;
};

export const useBleStore = create<BleStore>(set => ({
  bluetoothState: null,
  connectionStatus: 'disconnected',
  connectedDevice: null,
  isScanning: false,
  deviceWatch: null,

  setBluetoothState: state => set({ bluetoothState: state }),
  setConnectionStatus: status => set({ connectionStatus: status }),
  setConnectedDevice: device => set({ connectedDevice: device }),
  setScanning: scanning => set({ isScanning: scanning }),
  setDeviceWatch: payload => set({ deviceWatch: payload }),
  clearDeviceWatch: () => set({ deviceWatch: null }),
}));