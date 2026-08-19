import { HARDWARE_RELEASE } from '../../constants/hardwareRelease';
import type { AppUpdateInfo, DownloadFirmware } from './types';

/**
 * 固件更新的可用性判断与内容组装：纯函数，数据源为打包常量 + 设备上报版本。
 * 不涉及远程往返，无异步；升级条件为「目标版本 > 设备当前版本」。
 */
export function resolveFirmwareUpdate(
  deviceVersion: number | null,
): AppUpdateInfo | null {
  if (deviceVersion === null || HARDWARE_RELEASE.targetVersion <= deviceVersion) {
    return null;
  }
  return {
    currentVersion: deviceVersion,
    latestVersion: HARDWARE_RELEASE.targetVersion,
    changelog: [...HARDWARE_RELEASE.changelog],
  };
}

export function isFirmwareUpdateAvailable(deviceVersion: number | null): boolean {
  return resolveFirmwareUpdate(deviceVersion) !== null;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 固件下载/刷写占位：真实 BLE 固件升级实现后替换本函数，契约（异步 + 可抛错）不变。
 */
export const downloadFirmware: DownloadFirmware = async (_info) => {
  await delay(1200);
};