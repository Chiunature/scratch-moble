import { i18n } from '@scratch-mobile/i18n';

import { ensureProjectWithWorkspace } from '../../services/projects';
import {
  BUILD_GUIDE_CATALOG,
  getBuildGuideProjectId,
  getBuildGuideStarterWorkspace,
} from './data/bundles';

/**
 * 应用启动时补齐所有内置模型对应的「固定 ID」项目。
 *
 * 每个模型只对应一份作品：首次启动会用固定 ID + 初始 workspace 落盘；
 * 之后重复启动/打开都会命中同一 ID，因此不会在作品列表里重复新增。
 * 幂等，可安全重复调用（已存在的项目会保留用户后续的编辑与改名）。
 */
export async function provisionBuildGuideProjects(): Promise<void> {
  // ensureProjectWithWorkspace performs a read-modify-write on the shared
  // project index. Run the entries serially so one model cannot overwrite a
  // sibling model's freshly saved index entry.
  for (const entry of BUILD_GUIDE_CATALOG) {
    await ensureProjectWithWorkspace({
      id: getBuildGuideProjectId(entry.id),
      name: i18n.t(entry.nameKey, { ns: 'buildGuide' }),
      workspace: getBuildGuideStarterWorkspace(entry.id),
    });
  }
}
