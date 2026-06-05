import * as ScratchBlocks from 'scratch-blocks';
import type * as Blockly from 'blockly/core';

import { wrapScratchBlockInit } from '../blockInitPatch';
import {
  ARGUMENT_REPORTER_BLOCK_TYPES,
  type ArgumentReporterBlockType,
} from './constants';
import { logProcedureDrag } from './debug';
import { shouldSuppressPrototypeReporterDuplicate } from './gesture';

type ScratchDraggerLike = {
  setDraggable: (draggable: Blockly.IDraggable) => void;
};

let moduleGestureLock = false;
let unlockListenersInstalled = false;

function ensureWorkspaceGestureUnlockListeners(
  workspace: Blockly.WorkspaceSvg,
): void {
  if (unlockListenersInstalled) {
    return;
  }
  unlockListenersInstalled = true;
  const svg = workspace.getParentSvg();
  const unlock = () => {
    logProcedureDrag('reporter', 'module-gesture-lock:released');
    moduleGestureLock = false;
  };
  svg.addEventListener('pointerup', unlock);
  svg.addEventListener('pointercancel', unlock);
}

/**
 * 与 scratch-blocks DuplicateOnDragDraggable 一致，并针对 WebView 做手势去重。
 */
class GuardedDuplicateOnDragDraggable implements Blockly.IDraggable {
  private copy?: Blockly.BlockSvg;
  private isDuplicating_ = false;

  constructor(private block: Blockly.BlockSvg) {}

  isMovable(): boolean {
    return true;
  }

  private clearCopyRef(): void {
    this.copy = undefined;
  }

  private wrapCopyDragLifecycle(copy: Blockly.BlockSvg): void {
    const strategy = this;
    const origEndDrag = copy.endDrag.bind(copy);
    const origRevertDrag = copy.revertDrag.bind(copy);

    copy.endDrag = function (this: Blockly.BlockSvg, event: PointerEvent) {
      try {
        origEndDrag(event);
      } finally {
        strategy.clearCopyRef();
      }
    };

    copy.revertDrag = function (this: Blockly.BlockSvg) {
      try {
        origRevertDrag();
      } finally {
        strategy.clearCopyRef();
      }
    };
  }

  startDrag(e: PointerEvent): void {
    ensureWorkspaceGestureUnlockListeners(this.block.workspace);

    const inPrototype = this.block.getParent()?.type === 'procedures_prototype';

    if (this.block.isInsertionMarker?.()) {
      return;
    }

    if (inPrototype && shouldSuppressPrototypeReporterDuplicate(this.block, e)) {
      return;
    }

    if (moduleGestureLock) {
      logProcedureDrag('reporter', 'start-drag:skipped', {
        reason: 'module-gesture-lock',
        blockId: this.block.id,
      });
      return;
    }

    moduleGestureLock = true;
    this.isDuplicating_ = inPrototype;

    logProcedureDrag('reporter', 'start-drag', {
      blockId: this.block.id,
      blockType: this.block.type,
      inPrototype,
    });

    if (this.isDuplicating_) {
      const data = this.block.toCopyData();
      if (!data) {
        moduleGestureLock = false;
        return;
      }
      this.copy = ScratchBlocks.clipboard.paste(
        data,
        this.block.workspace,
      ) as Blockly.BlockSvg;
      this.copy.setDeletable(true);
      this.copy.setDragStrategy(
        new ScratchBlocks.dragging.BlockDragStrategy(this.copy),
      );
      this.wrapCopyDragLifecycle(this.copy);
      logProcedureDrag('reporter', 'copy-created', {
        sourceId: this.block.id,
        copyId: this.copy.id,
      });
      this.copy.startDrag(e);
      return;
    }

    this.block.setDeletable(true);
    const normalStrategy = new ScratchBlocks.dragging.BlockDragStrategy(
      this.block,
    );
    this.block.setDragStrategy(normalStrategy);
    this.copy = this.block;
    normalStrategy.startDrag(e);
  }

  drag(newLoc: Blockly.utils.Coordinate, e?: PointerEvent): void {
    const gesture = this.block.workspace.getGesture(e);
    if (!gesture || !this.copy) {
      return;
    }
    const dragger = gesture.getCurrentDragger() as ScratchDraggerLike | null;
    dragger?.setDraggable(this.copy);
    this.copy.drag(newLoc, e);
  }

  endDrag(e: PointerEvent): void {
    this.copy?.endDrag(e);
    this.clearCopyRef();
    this.isDuplicating_ = false;
  }

  revertDrag(): void {
    if (this.isDuplicating_) {
      this.copy?.dispose();
    } else {
      this.copy?.revertDrag();
    }
    this.clearCopyRef();
    this.isDuplicating_ = false;
  }

  getRelativeToSurfaceXY(): Blockly.utils.Coordinate {
    return this.copy
      ? this.copy.getRelativeToSurfaceXY()
      : this.block.getRelativeToSurfaceXY();
  }
}

function patchArgumentReporterBlock(blockType: ArgumentReporterBlockType): void {
  wrapScratchBlockInit(blockType, block => {
    if (blockType === 'argument_reporter_string_number') {
      block.outputConnection?.setCheck(null);
    }
    block.setDragStrategy(new GuardedDuplicateOnDragDraggable(block));
  });
}

function patchArgumentEditorBoolean(): void {
  wrapScratchBlockInit('argument_editor_boolean', block => {
    block.isSimpleReporter = () => false;
  });
}

export function patchProcedureReporterBlocks(): void {
  for (const blockType of ARGUMENT_REPORTER_BLOCK_TYPES) {
    patchArgumentReporterBlock(blockType);
  }
  patchArgumentEditorBoolean();
}
