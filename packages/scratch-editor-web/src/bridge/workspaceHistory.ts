import * as ScratchBlocks from 'scratch-blocks';

import type { EditorInMessage } from '@scratch-mobile/shared';
import { postToReactNative } from './index';
import { notifyCodeGenerationNeeded } from './codeGenNotify';
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

let workspaceRef: WorkspaceWithHistory | null = null;
let lastPublishedState: WorkspaceHistoryState | null = null;
let publishTimer: ReturnType<typeof setTimeout> | null = null;

function readWorkspaceHistoryState(
  workspace: WorkspaceWithHistory,
): WorkspaceHistoryState {
  return {
    canUndo: (workspace.getUndoStack?.().length ?? 0) > 0,
    canRedo: (workspace.getRedoStack?.().length ?? 0) > 0,
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

function runWorkspaceHistory(redo: boolean): void {
  if (!workspaceRef?.undo) {
    return;
  }

  const state = readWorkspaceHistoryState(workspaceRef);
  const canRun = redo ? state.canRedo : state.canUndo;
  if (!canRun) {
    publishWorkspaceHistory(true);
    return;
  }

  hideBlocklyChaff();
  workspaceRef.undo(redo);
  notifyCodeGenerationNeeded();
  publishWorkspaceHistory(true);
}

export function publishWorkspaceHistory(force = false): void {
  if (!workspaceRef) {
    return;
  }

  const nextState = readWorkspaceHistoryState(workspaceRef);
  updateWorkspaceFloatingHistoryState(nextState);
  if (!force && isSameHistoryState(lastPublishedState, nextState)) {
    return;
  }

  lastPublishedState = nextState;
  postToReactNative({
    type: 'editor.workspace.history',
    ...nextState,
  });
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

export function clearWorkspaceHistory(): void {
  workspaceRef?.clearUndo?.();
  publishWorkspaceHistory(true);
}

export function handleWorkspaceHistoryInbound(message: EditorInMessage): boolean {
  switch (message.type) {
    case 'editor.workspace.undo':
      runWorkspaceHistory(false);
      return true;
    case 'editor.workspace.redo':
      runWorkspaceHistory(true);
      return true;
    default:
      return false;
  }
}

export function setupWorkspaceHistory(workspace: Workspace): void {
  workspaceRef = workspace;
  lastPublishedState = null;
  if (publishTimer != null) {
    clearTimeout(publishTimer);
    publishTimer = null;
  }

  setupWorkspaceFloatingControls(workspace, {
    onUndo: () => runWorkspaceHistory(false),
    onRedo: () => runWorkspaceHistory(true),
  });
  workspace.addChangeListener(() => {
    scheduleWorkspaceHistoryPublish();
  });
  publishWorkspaceHistory(true);
}