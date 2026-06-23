import * as ScratchBlocks from 'scratch-blocks';

import type { EditorInMessage } from '@scratch-mobile/shared';
import { postToReactNative } from './index';
import type { Workspace } from '../codegen/types';
import { insertStartHatBlockIfMissing } from '../workspace-custom/ensureStartHatBlock';
import { normalizeDefaultShadowReportersInWorkspaceState } from '../workspace-custom/normalizeWorkspaceShadows';
import { refreshColoursFromParentInWorkspace } from '../blocks/portDropdownExtensions';
import { notifyCodeGenerationNeeded } from './codeGenNotify';

const WORKSPACE_SAVE_DEBOUNCE_MS = 1500;

type SerializedWorkspaceState = ReturnType<
  typeof ScratchBlocks.serialization.workspaces.save
>;

let activeProjectId: string | null = null;
let workspaceRevision = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastSentRevision = -1;
let lastSentBlockCount = -1;
let workspaceRef: Workspace | null = null;
/** 收到 workspace.load 并完成 hydration 前为 false，避免 load 前/中的编辑被持久化或丢失。 */
let isWorkspaceHydrated = false;

function clearDebounceTimer(): void {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function setWorkspaceInteractionBlocked(blocked: boolean): void {
  if (!workspaceRef) {
    return;
  }

  const svg = (
    workspaceRef as Workspace & { getParentSvg?: () => SVGElement | null }
  ).getParentSvg?.();
  const container = svg?.parentElement;
  if (!container) {
    return;
  }

  container.style.pointerEvents = blocked ? 'none' : '';
}

function serializeWorkspace(workspace: Workspace): unknown {
  const state = ScratchBlocks.serialization.workspaces.save(workspace);
  return normalizeDefaultShadowReportersInWorkspaceState(state);
}

function cloneWorkspaceState(state: unknown): unknown {
  return JSON.parse(JSON.stringify(state));
}

function loadWorkspaceState(workspace: Workspace, state: unknown | null): void {
  ScratchBlocks.Events.disable();
  try {
    workspace.clear();
    if (state != null) {
      const normalized = normalizeDefaultShadowReportersInWorkspaceState(
        cloneWorkspaceState(state),
      ) as SerializedWorkspaceState;
      ScratchBlocks.serialization.workspaces.load(normalized, workspace, {
        recordUndo: false,
      });
    }
  } finally {
    ScratchBlocks.Events.enable();
  }
}

function flushWorkspaceChanged(force = false): void {
  clearDebounceTimer();

  if (!workspaceRef || !activeProjectId) {
    return;
  }

  if (!force && !isWorkspaceHydrated) {
    return;
  }

  const blockCount = workspaceRef.getAllBlocks(false).length;
  if (!force) {
    workspaceRevision += 1;
  }
  const revision = workspaceRevision;

  if (
    !force &&
    revision === lastSentRevision &&
    blockCount === lastSentBlockCount
  ) {
    return;
  }

  lastSentRevision = revision;
  lastSentBlockCount = blockCount;

  postToReactNative({
    type: 'editor.workspace.changed',
    projectId: activeProjectId,
    workspace: serializeWorkspace(workspaceRef),
    blockCount,
    revision,
  });
}

function scheduleWorkspaceChanged(): void {
  if (!workspaceRef || !activeProjectId || !isWorkspaceHydrated) {
    return;
  }
  clearDebounceTimer();
  debounceTimer = setTimeout(() => {
    flushWorkspaceChanged(false);
  }, WORKSPACE_SAVE_DEBOUNCE_MS);
}

function handleWorkspaceLoad(
  message: Extract<EditorInMessage, { type: 'editor.workspace.load' }>,
): void {
  if (!workspaceRef) {
    return;
  }

  isWorkspaceHydrated = false;
  setWorkspaceInteractionBlocked(true);
  clearDebounceTimer();

  activeProjectId = message.projectId;
  lastSentRevision = -1;
  lastSentBlockCount = -1;
  workspaceRevision = message.revision;
  loadWorkspaceState(workspaceRef, message.workspace);
  insertStartHatBlockIfMissing(workspaceRef);
  refreshColoursFromParentInWorkspace(workspaceRef);
  workspaceRef.resize?.();
  notifyCodeGenerationNeeded();

  isWorkspaceHydrated = true;
  setWorkspaceInteractionBlocked(false);

  postToReactNative({
    type: 'editor.workspace.loaded',
    projectId: message.projectId,
  });
}

function handleWorkspaceFlush(
  message: Extract<EditorInMessage, { type: 'editor.workspace.flush' }>,
): void {
  if (message.projectId !== activeProjectId) {
    return;
  }
  flushWorkspaceChanged(true);
}

export function handleWorkspacePersistenceInbound(
  message: EditorInMessage,
): boolean {
  switch (message.type) {
    case 'editor.workspace.load':
      handleWorkspaceLoad(message);
      return true;
    case 'editor.workspace.flush':
      handleWorkspaceFlush(message);
      return true;
    default:
      return false;
  }
}

export function setupWorkspacePersistence(workspace: Workspace): void {
  workspaceRef = workspace;
  isWorkspaceHydrated = false;
  activeProjectId = null;
  setWorkspaceInteractionBlocked(true);

  workspace.addChangeListener(() => {
    scheduleWorkspaceChanged();
  });

  postToReactNative({ type: 'editor.workspace.ready' });
}
