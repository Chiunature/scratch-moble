/** 一次可用的更新信息（数据源产出，语义上区别于 UI 投影） */
export type AppUpdateInfo = {
  currentVersion: string;
  latestVersion: string;
  changelog: string[];
};

/** 逻辑层投影给 UI 的只读视图；当前与 AppUpdateInfo 同构，将来可扩展进度等字段 */
export type UpdateAvailableView = AppUpdateInfo;

/** 更新数据源契约：远程 API / BLE 固件 / mock 均可实现，UI 不感知具体来源 */
export type UpdateCheckService = {
  /** 返回 null 表示当前无可用更新 */
  checkForUpdate(): Promise<AppUpdateInfo | null>;
  downloadUpdate(info: AppUpdateInfo): Promise<void>;
};