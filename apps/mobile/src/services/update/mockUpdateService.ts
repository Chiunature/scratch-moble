import { APP_VERSION } from '../../constants/appVersion';
import type { AppUpdateInfo, UpdateCheckService } from './types';

const MOCK_LATEST_VERSION = '1.0.1';

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 占位数据源：模拟远程版本检查与下载耗时。
 * 后续接入真实远程 API / BLE 固件升级时替换本实现，契约不变。
 */
export const mockUpdateService: UpdateCheckService = {
  async checkForUpdate(): Promise<AppUpdateInfo | null> {
    await delay(400);
    return {
      currentVersion: APP_VERSION,
      latestVersion: MOCK_LATEST_VERSION,
      changelog: ['修复了已知问题', '优化了用户体验', '增加了新功能'],
    };
  },
  async downloadUpdate(_info: AppUpdateInfo): Promise<void> {
    await delay(1200);
  },
};