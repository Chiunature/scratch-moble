import * as ScratchBlocks from 'scratch-blocks';

import type { EditorInMessage } from '@scratch-mobile/shared';
import { postToReactNative } from './index';
import type { Workspace } from '../codegen/types';
import { insertStartHatBlockIfMissing } from '../workspace-custom/ensureStartHatBlock';
import { normalizeDefaultShadowReportersInWorkspaceState } from '../workspace-custom/normalizeWorkspaceShadows';
import { refreshColoursFromParentInWorkspace } from '../blocks/portDropdownExtensions';

const WORKSPACE_SAVE_DEBOUNCE_MS = 1500;

type SerializedWorkspaceState = ReturnType<
  typeof ScratchBlocks.serialization.workspaces.save
>;

type PersistenceDeps = {
  /** workspace.load 完成 hydration 后触发（清历史 + 立即 codegen） */
  onWorkspaceLoaded: () => void;
};

export type WorkspacePersistence = {
  scheduleChange: () => void;
  handleInbound: (message: EditorInMessage) => boolean;
  dispose: () => void;
};

export function createWorkspacePersistence(
  workspace: Workspace,
  deps: PersistenceDeps,
): WorkspacePersistence {
  let activeProjectId: string | null = null;
  let workspaceRevision = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSentRevision = -1;
  let lastSentBlockCount = -1;
  /** 收到 workspace.load 并完成 hydration 前为 false，避免 load 前/中的编辑被持久化或丢失。 */
  let isWorkspaceHydrated = false;

  function clearDebounceTimer(): void {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function setWorkspaceInteractionBlocked(blocked: boolean): void {
    const svg = (
      workspace as Workspace & { getParentSvg?: () => SVGElement | null }
    ).getParentSvg?.();
    const container = svg?.parentElement;
    if (!container) {
      return;
    }

    container.style.pointerEvents = blocked ? 'none' : '';
  }

  function serializeWorkspace(ws: Workspace): unknown {
    const state = ScratchBlocks.serialization.workspaces.save(ws);
    return normalizeDefaultShadowReportersInWorkspaceState(state);
  }

  function cloneWorkspaceState(state: unknown): unknown {
    return JSON.parse(JSON.stringify(state));
  }

  function loadWorkspaceState(ws: Workspace, state: unknown | null): void {
    ScratchBlocks.Events.disable();
    try {
      ws.clear();
      if (state != null) {
        const normalized = normalizeDefaultShadowReportersInWorkspaceState(
          cloneWorkspaceState(state),
        ) as SerializedWorkspaceState;
        ScratchBlocks.serialization.workspaces.load(normalized, ws, {
          recordUndo: false,
        });
      }
    } finally {
      ScratchBlocks.Events.enable();
    }
  }

  function flushWorkspaceChanged(force = false): void {
    clearDebounceTimer();

    if (!activeProjectId) {
      return;
    }

    if (!force && !isWorkspaceHydrated) {
      return;
    }

    const blockCount = workspace.getAllBlocks(false).length;
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
      workspace: serializeWorkspace(workspace),
      blockCount,
      revision,
    });
  }

  function scheduleWorkspaceChanged(): void {
    if (!activeProjectId || !isWorkspaceHydrated) {
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
    isWorkspaceHydrated = false;
    setWorkspaceInteractionBlocked(true);
    clearDebounceTimer();

    activeProjectId = message.projectId;
    lastSentRevision = -1;
    lastSentBlockCount = -1;
    workspaceRevision = message.revision;
    loadWorkspaceState(workspace, message.workspace);
    insertStartHatBlockIfMissing(workspace);
    refreshColoursFromParentInWorkspace(workspace);
    workspace.resize?.();
    deps.onWorkspaceLoaded();

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

  function handleInbound(message: EditorInMessage): boolean {
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

  function dispose(): void {
    clearDebounceTimer();
  }

  // 初始化：阻塞交互直到首次 hydration；向 RN 宣告就绪。
  isWorkspaceHydrated = false;
  activeProjectId = null;
  setWorkspaceInteractionBlocked(true);
  postToReactNative({ type: 'editor.workspace.ready' });

  return {
    scheduleChange: scheduleWorkspaceChanged,
    handleInbound,
    dispose,
  };
}