import { BleManager } from 'react-native-ble-plx';

let sharedBleManager: BleManager | null = null;

export function getSharedBleManager(): BleManager {
  if (!sharedBleManager) {
    sharedBleManager = new BleManager();
  }
  return sharedBleManager;
}

export function destroySharedBleManager(): void {
  sharedBleManager?.destroy();
  sharedBleManager = null;
}
