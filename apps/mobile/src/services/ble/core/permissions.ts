import { Linking, PermissionsAndroid, Platform } from 'react-native';

export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const apiLevel = Platform.Version;
  if (typeof apiLevel === 'number' && apiLevel >= 31) {
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

/** 打开系统蓝牙设置页；失败（无对应 intent / 平台不支持）返回 false。 */
export async function openBluetoothSettings(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
      return true;
    }
    if (Platform.OS === 'ios') {
      return Linking.openURL('app-settings:');
    }
    return false;
  } catch {
    return false;
  }
}
