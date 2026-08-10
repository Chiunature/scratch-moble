import { setLdrOptions } from '@scratch-mobile/ldr-engine';

import type { BuildGuideSettings } from './types';

/**
 * 同步到 LDR.Options，供运行时材质和 stud 加载读取。
 * oldColor 保留旧值（默认 0xffff6f），由 ldr-engine 侧合并处理。
 */
export function syncLdrOptions(settings: BuildGuideSettings): void {
  setLdrOptions({
    lineContrast: settings.lineContrast,
    showOldColors: settings.showOldColors,
    studHighContrast: settings.studHighContrast,
    studLogo: 0,
    lineColor: settings.lineContrast === 0 ? 0 : 0x333333,
  });
}