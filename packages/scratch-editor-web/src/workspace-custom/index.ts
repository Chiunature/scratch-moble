/**
 * 工作区注入后的定制逻辑（不修改 scratch-blocks 源码）：缩放条内置图标、工具箱二次点击关飞出栏等。
 */
export { setupFlyoutWidthClamp } from './flyoutWidthClamp';
export {
  ensureScratchZoomControlsIfMissing,
  patchScratchZoomControlImages,
} from './patchScratchZoom';
export { patchToolboxCategoryIcons } from './patchToolboxCategoryIcons';
export { setupToolboxDoubleClickHideFlyout } from './toolboxDoubleClickHideFlyout';
