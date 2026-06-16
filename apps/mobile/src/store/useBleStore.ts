import { create } from 'zustand';
import type { State } from 'react-native-ble-plx';

import type { BleDevice, DeviceWatchPayload } from '../services/ble';

export type BleConnectionStatus = 'disconnected' | 'connecting' | 'connected';

type BleStore = {
  bluetoothState: State | null;
  connectionStatus: BleConnectionStatus;
  connectedDevice: BleDevice | null;
  deviceWatch: DeviceWatchPayload | null;

  setBluetoothState: (state: State) => void;
  setConnectionStatus: (status: BleConnectionStatus) => void;
  setConnectedDevice: (device: BleDevice | null) => void;
  setDeviceWatch: (payload: DeviceWatchPayload) => void;
  clearDeviceWatch: () => void;
  resetConnection: () => void;
};

export const useBleStore = create<BleStore>(set => ({
  bluetoothState: null,
  connectionStatus: 'disconnected',
  connectedDevice: null,
  deviceWatch: null,

  setBluetoothState: state => set({ bluetoothState: state }),
  setConnectionStatus: status => set({ connectionStatus: status }),
  setConnectedDevice: device => set({ connectedDevice: device }),
  setDeviceWatch: payload => set({ deviceWatch: payload }),
  clearDeviceWatch: () => set({ deviceWatch: null }),
  resetConnection: () =>
    set({
      connectionStatus: 'disconnected',
      connectedDevice: null,
      deviceWatch: null,
    }),
}));
