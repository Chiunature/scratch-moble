/** 一次可用的固件更新信息（打包静态数据 + 设备上报版本组合而成） */
export type AppUpdateInfo = {
  currentVersion: number;
  latestVersion: number;
  changelog: string[];
};

/** 逻辑层投影给 UI 的只读视图；当前与 AppUpdateInfo 同构 */
export type UpdateAvailableView = AppUpdateInfo;

/** 固件下载/刷写：真实异步操作（BLE 固件升级），失败可抛错 */
export type DownloadFirmware = (info: AppUpdateInfo) => Promise<void>;