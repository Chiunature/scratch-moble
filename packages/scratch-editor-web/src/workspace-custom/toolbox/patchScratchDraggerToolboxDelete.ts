/**
 * 允许将积木拖到工具箱/飞栏删除区时删除，即使指针已离开主工作区 SVG。
 * scratch-blocks 的 ScratchDragger 在 draggedOutOfBounds 时会屏蔽删除，适用于背包/换精灵场景，
 * 但不应阻止「拖到左侧积木栏删除」。
 *
 * 同时把 setDeleteStyle 同步到整段积木栈——Blockly 默认只作用于被拖的那一块，
 * scratch-blocks 的 blocklyDraggingDelete 样式又只有删除光标、没有半透明。
 */
import * as ScratchBlocks from 'scratch-blocks';
import type * as Blockly from 'blockly/core';

const PATCH_KEY = '__scratchEditorWebDraggerDeletePatched';

type DraggerLike = {
  draggedOutOfBounds?: boolean;
  workspace: Blockly.WorkspaceSvg;
  draggable: Blockly.IDraggable;
  getRoot: (draggable: Blockly.IDraggable) => Blockly.IDraggable;
  wouldDeleteDraggable: (
    event: PointerEvent,
    rootDraggable: Blockly.IDraggable & Blockly.IDeletable,
  ) => boolean;
  shouldReturnToStart: (
    event: PointerEvent,
    rootDraggable: Blockly.IDraggable,
  ) => boolean;
  onDrag: (event: PointerEvent, totalDelta: Blockly.utils.Coordinate) => void;
  onDragEnd: (event: PointerEvent) => void;
};

function isDeletableBlock(
  draggable: Blockly.IDraggable,
): draggable is Blockly.BlockSvg & Blockly.IDeletable {
  return (
    draggable instanceof ScratchBlocks.BlockSvg &&
    ScratchBlocks.isDeletable(draggable)
  );
}

function forEachBlockInStack(
  root: Blockly.BlockSvg,
  fn: (block: Blockly.BlockSvg) => void,
): void {
  let current: Blockly.BlockSvg | null = root;
  while (current) {
    fn(current);
    current = current.getNextBlock();
  }
}

function applyDeleteStyleToStack(
  root: Blockly.BlockSvg,
  wouldDelete: boolean,
): void {
  forEachBlockInStack(root, block => {
    if (ScratchBlocks.isDeletable(block)) {
      block.setDeleteStyle(wouldDelete);
    }
  });
}

function isOverDeleteArea(
  workspace: Blockly.WorkspaceSvg,
  event: PointerEvent,
  rootDraggable: Blockly.IDraggable,
): boolean {
  const target = workspace.getDragTarget(event);
  if (!target) {
    return false;
  }
  if (
    !workspace
      .getComponentManager()
      .hasCapability(
        target.id,
        ScratchBlocks.ComponentManager.Capability.DELETE_AREA,
      )
  ) {
    return false;
  }
  return (target as Blockly.IDeleteArea).wouldDelete(rootDraggable);
}

export function patchScratchDraggerToolboxDelete(): void {
  const DraggerClass = ScratchBlocks.registry.getClass(
    ScratchBlocks.registry.Type.BLOCK_DRAGGER,
    ScratchBlocks.registry.DEFAULT,
  ) as (new (...args: unknown[]) => Blockly.dragging.Dragger) | null;

  if (!DraggerClass) {
    return;
  }
  if ((DraggerClass as unknown as Record<string, boolean>)[PATCH_KEY]) {
    return;
  }
  (DraggerClass as unknown as Record<string, boolean>)[PATCH_KEY] = true;

  const proto = DraggerClass.prototype as DraggerLike;
  const origWouldDelete = proto.wouldDeleteDraggable;
  const origShouldReturn = proto.shouldReturnToStart;
  const origOnDrag = proto.onDrag;
  const origOnDragEnd = proto.onDragEnd;

  proto.wouldDeleteDraggable = function (
    event: PointerEvent,
    rootDraggable: Blockly.IDraggable & Blockly.IDeletable,
  ) {
    if (isOverDeleteArea(this.workspace, event, rootDraggable)) {
      return true;
    }
    if (this.draggedOutOfBounds) {
      return false;
    }
    return origWouldDelete.call(this, event, rootDraggable);
  };

  proto.shouldReturnToStart = function (
    event: PointerEvent,
    rootDraggable: Blockly.IDraggable,
  ) {
    if (isOverDeleteArea(this.workspace, event, rootDraggable)) {
      return false;
    }
    if (this.draggedOutOfBounds) {
      return true;
    }
    return origShouldReturn.call(this, event, rootDraggable);
  };

  proto.onDrag = function (
    event: PointerEvent,
    totalDelta: Blockly.utils.Coordinate,
  ) {
    origOnDrag.call(this, event, totalDelta);
    const root = this.getRoot(this.draggable);
    if (!isDeletableBlock(root)) {
      return;
    }
    applyDeleteStyleToStack(
      root,
      this.wouldDeleteDraggable(event, root),
    );
  };

  proto.onDragEnd = function (event: PointerEvent) {
    const root = this.getRoot(this.draggable);
    if (isDeletableBlock(root)) {
      applyDeleteStyleToStack(root, false);
    }
    origOnDragEnd.call(this, event);
  };
}
