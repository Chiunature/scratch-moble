import type * as Blockly from 'blockly/core';

import { installProcedureDragDebugWorkspace } from './debugWorkspace';
import { registerProcedureDefinitionInsertionMarkerPreviewer } from './insertionMarker';
import { patchProcedureReporterBlocks } from './reporterBlocks';

/**
 * 自制积木拖动相关补丁（须在 ScratchBlocks.inject 之前调用）：
 * - 参数块拖出复制与 WebView 手势去重
 * - 定义帽块拼接预览（参数槽 shadow 化，防泄漏）
 */
export function patchProcedureWorkspaceBehavior(): void {
  patchProcedureReporterBlocks();
  registerProcedureDefinitionInsertionMarkerPreviewer();
}

/** inject 之后可选调用；仅 __SCRATCH_DEBUG_PROCEDURE_DRAG__ 为 true 时生效 */
export function installProcedureDragDebug(
  workspace: Blockly.WorkspaceSvg,
): void {
  installProcedureDragDebugWorkspace(workspace);
}
