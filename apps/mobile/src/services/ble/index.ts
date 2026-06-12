import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device, type State } from 'react-native-ble-plx';

export type BleDevice = {
  id: string;
  name: string;
  rssi: number | null;
};

const bleManager = new BleManager();
let isScanning = false;

export const getBleManager = () => bleManager;
//针对安卓12+，请求蓝牙相关权限
async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const apiLevel = Platform.Version;
  if (typeof apiLevel === 'number' && apiLevel >= 31) {
    //一次性请求多个权限。granted，允许，denied，拒绝，never_ask_again，不再询问
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    return (
      results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
//注册监听蓝牙开关状态变化
export function subscribeBluetoothState(
  onStateChange: (state: State) => void,
): () => void {
  const subscription = bleManager.onStateChange(onStateChange, true);
  return () => subscription.remove();
}

export async function startScan(
  onDeviceFound: (device: BleDevice) => void,
): Promise<void> {
  if (isScanning) {
    return;
  }

  const hasPermission = await requestBlePermissions();
  if (!hasPermission) {
    throw new Error('蓝牙权限未授予');
  }

  const state = await bleManager.state();
  if (state !== 'PoweredOn') {
    throw new Error(`蓝牙未开启（${state}）`);
  }

  isScanning = true;
  bleManager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.warn('BLE scan error:', error.message);
      return;
    }
    if (!device) {
      return;
    }

    if (device.name === 'Spark_AI') {
      onDeviceFound({
        id: device.id,
        name: device.name ?? device.localName ?? '未知设备',
        rssi: device.rssi,
      });
      return;
    }
  });
}

export function stopScan(): void {
  if (!isScanning) {
    return;
  }

  bleManager.stopDeviceScan();
  isScanning = false;
}
