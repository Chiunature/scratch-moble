import * as ScratchBlocks from 'scratch-blocks';
import type * as Blockly from 'blockly/core';

import { DEFINITION_HAT_BLOCK_TYPES } from './constants';
import { logProcedureDrag } from './debug';

type GestureWithStart = {
  startBlock?: Blockly.BlockSvg | null;
  isDragging?: () => boolean;
  getCurrentDragger?: () => { draggable?: Blockly.IDraggable } | null;
};

type ScratchDraggerLike = {
  draggable?: Blockly.IDraggable;
};

function getProcedureDragRoot(
  draggable: Blockly.IDraggable,
): Blockly.BlockSvg | null {
  if (!(draggable instanceof ScratchBlocks.BlockSvg)) {
    return null;
  }
  if (draggable.isShadow() || draggable.type === 'procedures_prototype') {
    const parent = draggable.getParent();
    return parent instanceof ScratchBlocks.BlockSvg ? parent : null;
  }
  return draggable;
}

function getActiveDefinitionDragRoot(
  workspace: Blockly.WorkspaceSvg,
  e?: PointerEvent,
): Blockly.BlockSvg | null {
  const gesture = workspace.getGesture(e) as unknown as GestureWithStart | null;
  if (!gesture?.isDragging?.()) {
    return null;
  }
  const draggable = (gesture.getCurrentDragger?.() as ScratchDraggerLike | null)
    ?.draggable;
  if (!draggable) {
    return null;
  }
  const dragRoot = getProcedureDragRoot(draggable);
  return dragRoot?.type === 'procedures_definition' ? dragRoot : null;
}

function isDefinitionHatGestureStart(
  start: Blockly.BlockSvg | null | undefined,
): boolean {
  return Boolean(start?.type && DEFINITION_HAT_BLOCK_TYPES.has(start.type));
}

/**
 * 拖整顶帽块时抑制原型内参数块的误复制；手指明确点在参数块上时仍允许拖下。
 */
export function shouldSuppressPrototypeReporterDuplicate(
  block: Blockly.BlockSvg,
  e?: PointerEvent,
): boolean {
  if (block.getParent()?.type !== 'procedures_prototype') {
    return false;
  }

  const gesture = block.workspace.getGesture(e) as unknown as
    | GestureWithStart
    | null;
  const start = gesture?.startBlock;

  if (start === block) {
    return false;
  }

  if (isDefinitionHatGestureStart(start)) {
    logProcedureDrag('reporter', 'suppress-duplicate', {
      reason: 'gesture-started-on-definition-stack',
      reporterId: block.id,
      startType: start?.type,
      startId: start?.id,
    });
    return true;
  }

  const definitionDragRoot = getActiveDefinitionDragRoot(block.workspace, e);
  if (definitionDragRoot) {
    logProcedureDrag('reporter', 'suppress-duplicate', {
      reason: 'definition-drag-in-progress',
      reporterId: block.id,
      definitionId: definitionDragRoot.id,
    });
    return true;
  }

  return false;
}
