import { HARDWARE_VERSION } from './appVersion';

/**
 * 固件 release：app 内置、随打包更新的静态数据（非远程数据源）。
 * 发布新固件时改这一处：HARDWARE_VERSION（package.json）+ 下方 changelog。
 */
export const HARDWARE_RELEASE = {
  /** 目标固件版本（app 恒为最新），与设备上报版本比较决定是否可升级 */
  targetVersion: Number(HARDWARE_VERSION),
  changelog: ['修复了已知问题', '优化了用户体验', '增加了新功能'],
} as const;