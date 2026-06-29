import { i18n } from '@scratch-mobile/i18n';

/** 传感器监控 / 端口读数（非 React 上下文） */
export function tDeviceWatch(
  key: string,
  options?: Record<string, unknown>,
): string {
  return i18n.getFixedT(null, 'deviceWatch')(key, options);
}
