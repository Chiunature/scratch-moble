import * as ScratchBlocks from 'scratch-blocks';
import type * as Blockly from 'blockly/core';

import { ARGUMENT_REPORTER_TYPE_SET } from './constants';
import { isProcedureDragDebugEnabled, logProcedureDrag } from './debug';

/** 仅调试开启时注册：监听参数块创建来源 */
export function installProcedureDragDebugWorkspace(
  workspace: Blockly.WorkspaceSvg,
): void {
  if (!isProcedureDragDebugEnabled()) {
    return;
  }

  workspace.addChangeListener(event => {
    if (event.type !== 'create' || event.isUiEvent) {
      return;
    }
    const blockId = (event as { blockId?: string }).blockId;
    if (!blockId) {
      return;
    }
    const block = workspace.getBlockById(blockId);
    if (!block || !ARGUMENT_REPORTER_TYPE_SET.has(block.type)) {
      return;
    }

    const parent = block.getParent();
    logProcedureDrag('reporter', 'workspace:create', {
      blockId: block.id,
      blockType: block.type,
      parentType: parent?.type ?? null,
      parentId: parent?.id ?? null,
      topType: block.getRootBlock().type,
      isInsertionMarker: block.isInsertionMarker?.() ?? false,
      gestureInProgress: ScratchBlocks.Gesture.inProgress(),
    });
  });
}
