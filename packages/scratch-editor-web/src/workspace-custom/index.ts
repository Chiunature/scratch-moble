/**
 * 工作区注入后的定制逻辑（不修改 scratch-blocks 源码）。
 *
 * 子目录按职责分类：
 * - fields：数字字段编辑器（滑块 / 键盘）
 * - flyout：飞出栏布局补丁
 * - toolbox：工具箱 DOM / 图标 / 交互
 * - zoom：缩放控件补丁
 */
export {
  patchFieldNumberEditor,
  type ScratchNumberKeyboardMode,
} from './fields';
export { patchFlyoutGetWidthWhenHidden, setupFlyoutWidthClamp } from './flyout';
export {
  patchToolboxCategoryIcons,
  setupToolboxDoubleClickHideFlyout,
} from './toolbox';
export {
  ensureScratchZoomControlsIfMissing,
  patchScratchZoomControlImages,
} from './zoom';
