import * as ScratchBlocks from 'scratch-blocks';

import type { Workspace } from '../codegen/types';
import {
  setupWorkspaceFloatingControls,
  updateWorkspaceFloatingHistoryState,
} from '../workspace-custom/controls';

type WorkspaceWithHistory = Workspace & {
  getUndoStack?: () => unknown[];
  getRedoStack?: () => unknown[];
  undo?: (redo: boolean) => void;
  clearUndo?: () => void;
};

type WorkspaceHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
};

type HistoryDeps = {
  /** undo/redo 后立即触发 codegen，避免仅靠 change 监听漏刷 */
  onCodeGenerationNeeded: () => void;
};

export type WorkspaceHistory = {
  clear: () => void;
  schedulePublish: () => void;
  dispose: () => void;
};

export function createWorkspaceHistory(
  workspace: Workspace,
  deps: HistoryDeps,
): WorkspaceHistory {
  const workspaceWithHistory = workspace as WorkspaceWithHistory;
  let lastPublishedState: WorkspaceHistoryState | null = null;
  let publishTimer: ReturnType<typeof setTimeout> | null = null;

  function readWorkspaceHistoryState(
    ws: WorkspaceWithHistory,
  ): WorkspaceHistoryState {
    return {
      canUndo: (ws.getUndoStack?.().length ?? 0) > 0,
      canRedo: (ws.getRedoStack?.().length ?? 0) > 0,
    };
  }

  function isSameHistoryState(
    left: WorkspaceHistoryState | null,
    right: WorkspaceHistoryState,
  ): boolean {
    return left?.canUndo === right.canUndo && left.canRedo === right.canRedo;
  }

  function hideBlocklyChaff(): void {
    (ScratchBlocks as unknown as { hideChaff?: () => void }).hideChaff?.();
  }

  function publishWorkspaceHistory(force = false): void {
    const nextState = readWorkspaceHistoryState(workspaceWithHistory);
    updateWorkspaceFloatingHistoryState(nextState);
    if (!force && isSameHistoryState(lastPublishedState, nextState)) {
      return;
    }
    lastPublishedState = nextState;
  }

  function runWorkspaceHistory(redo: boolean): void {
    if (!workspaceWithHistory.undo) {
      return;
    }

    const state = readWorkspaceHistoryState(workspaceWithHistory);
    const canRun = redo ? state.canRedo : state.canUndo;
    if (!canRun) {
      publishWorkspaceHistory(true);
      return;
    }

    hideBlocklyChaff();
    workspaceWithHistory.undo(redo);
    deps.onCodeGenerationNeeded();
    publishWorkspaceHistory(true);
  }

  function scheduleWorkspaceHistoryPublish(): void {
    if (publishTimer != null) {
      return;
    }
    publishTimer = setTimeout(() => {
      publishTimer = null;
      publishWorkspaceHistory(false);
    }, 0);
  }

  function clear(): void {
    workspaceWithHistory.clearUndo?.();
    publishWorkspaceHistory(true);
  }

  function dispose(): void {
    if (publishTimer != null) {
      clearTimeout(publishTimer);
      publishTimer = null;
    }
  }

  setupWorkspaceFloatingControls(workspace, {
    onUndo: () => runWorkspaceHistory(false),
    onRedo: () => runWorkspaceHistory(true),
  });
  publishWorkspaceHistory(true);

  return {
    clear,
    schedulePublish: scheduleWorkspaceHistoryPublish,
    dispose,
  };
}