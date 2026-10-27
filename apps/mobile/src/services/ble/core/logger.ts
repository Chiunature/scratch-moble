const TAG = '[BLE]';

/**
 * 与 react-native-ble-plx 的 BleErrorCode 对齐。
 * iOS 取消通知（断开、cancelTransaction、BleManager 销毁）回调 OperationCancelled(2)；
 * Android 多半直接给 DeviceDisconnected(201)，取消错误会被原生层丢掉。
 */
const EXPECTED_BLE_STOP_CODES = new Set<number>([
  1, // BluetoothManagerDestroyed
  2, // OperationCancelled
  201, // DeviceDisconnected
]);

function formatBytesHex(bytes: number[], maxLength = 64): string {
  const slice = bytes.slice(0, maxLength);
  const hex = slice.map(b => b.toString(16).padStart(2, '0')).join(' ');
  if (bytes.length > maxLength) {
    return `${hex} ... (+${bytes.length - maxLength} bytes)`;
  }
  return hex;
}

export const bleLog = {
  info: (...args: unknown[]) => console.log(TAG, ...args),
  warn: (...args: unknown[]) => console.warn(TAG, ...args),
  error: (...args: unknown[]) => console.error(TAG, ...args),
  debug: (...args: unknown[]) => console.debug(TAG, ...args),
  tx: (label: string, frame: number[]) =>
    console.log(TAG, `[TX] ${label}`, formatBytesHex(frame)),
  rx: (label: string, payload: unknown) =>
    console.log(TAG, `[RX] ${label}`, payload),
  formatBytesHex,
};

function readBleErrorCode(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('errorCode' in error)) {
    return null;
  }

  const errorCode = (error as { errorCode?: unknown }).errorCode;
  return typeof errorCode === 'number' ? errorCode : null;
}

/** 断开或取消监听时的预期错误，不是通知本身失败 */
export function isBleDisconnectError(error: unknown): boolean {
  const errorCode = readBleErrorCode(error);
  if (errorCode !== null && EXPECTED_BLE_STOP_CODES.has(errorCode)) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /disconnected|operation was cancelled|operation was canceled/i.test(
    message,
  );
}
