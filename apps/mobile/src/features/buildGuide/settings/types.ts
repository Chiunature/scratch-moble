/** 与 buildinginstructions.js LDR.Options 对齐的可调渲染/动画选项 */

/** 0=高对比描边, 1=标准 LDraw 描边 */
export type LineContrastMode = 0 | 1;

/** 0=关, 1=开（圆柱黑实心） */
export type StudHighContrastMode = 0 | 1;

/**
 * 新零件高亮：
 * 0=新件红描边
 * 1=新件亮绿描边
 * 2=全部真实颜色
 * 3=旧件单色，新件真实色
 */
export type ShowOldColorsMode = 0 | 1 | 2 | 3;

/** 0=慢速, 1=正常, 2=关（瞬间） */
export type StepAnimationMode = 0 | 1 | 2;

export type BuildGuideSettings = {
  lineContrast: LineContrastMode;
  studHighContrast: StudHighContrastMode;
  showOldColors: ShowOldColorsMode;
  showStepRotationAnimations: StepAnimationMode;
};

export const DEFAULT_BUILD_GUIDE_SETTINGS: BuildGuideSettings = {
  lineContrast: 0,
  studHighContrast: 0,
  showOldColors: 0,
  showStepRotationAnimations: 1,
};

/** 切换后需重建 stud 几何并重载模型 */
export function isGeometryOption(
  key: keyof BuildGuideSettings,
): key is 'studHighContrast' {
  return key === 'studHighContrast';
}

/** 切换后只需重刷材质外观 */
export function isAppearanceOption(
  key: keyof BuildGuideSettings,
): key is 'lineContrast' | 'showOldColors' {
  return key === 'lineContrast' || key === 'showOldColors';
}
