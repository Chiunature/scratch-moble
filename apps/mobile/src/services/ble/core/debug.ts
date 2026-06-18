/** 设为 true 时在 Metro 打印主机 Notify / deviceWatch JSON（过滤 [BLE]） */
export const BLE_DEVICE_WATCH_DEBUG = true;

export function isDeviceWatchDebugEnabled(): boolean {
  return BLE_DEVICE_WATCH_DEBUG;
}
