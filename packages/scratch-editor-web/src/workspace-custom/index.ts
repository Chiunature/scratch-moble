/**
 * 工作区注入后的定制逻辑（不修改 scratch-blocks 源码）。
 *
 * 子目录按职责分类：
 * - fields：数字字段编辑器（滑块 / 键盘）、矩阵灯、音符、手柄按键
 * - flyout：飞出栏布局补丁
 * - toolbox：工具箱 DOM / 图标 / 交互
 * - controls：工作区浮动按钮（撤销、重做、缩放）
 * - procedureDrag：自制积木拖动与拼接预览
 */
export {
  patchFieldNumberEditor,
  patchFieldMatrixLight,
  patchFieldNotePicker,
  patchFieldHandleShankPicker,
  patchFieldPortMulti,
  patchMathNumberField,
} from './fields';
export { patchFlyoutGetWidthWhenHidden, setupFlyoutWidthClamp } from './flyout';
export {
  patchToolboxCategoryIcons,
  patchScratchDraggerToolboxDelete,
  patchToolboxDeleteWhenFlyoutHidden,
  setupToolboxDoubleClickHideFlyout,
} from './toolbox';
export {
  setupWorkspaceFloatingControls,
  updateWorkspaceFloatingHistoryState,
} from './controls';
export {
  setupDynamicToolboxCategories,
  setupDynamicToolboxCategoriesAndRefreshFlyout,
  rebuildContinuousFlyout,
} from './dynamicToolbox';
export {
  patchProcedureWorkspaceBehavior,
  installProcedureDragDebug,
} from './procedureDrag';
export { patchDataVariableReporterOutput } from './patchDataVariableReporter';
export {
  insertStartHatBlockIfMissing,
  setupStartHatBlock,
} from './ensureStartHatBlock';
export { openVariablePrompt, handleVariablePromptInbound } from './variablePromptBridge';
export {
  ensureProcedureEditorModalDom,
  openProcedureEditorModal,
  closeProcedureEditorModal,
} from './procedureEditor';
export { initScratchLocale } from './initScratchLocale';
export { patchContextMenuMissingTextGuard } from './patchContextMenuMissingTextGuard';
