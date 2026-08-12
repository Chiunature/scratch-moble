import * as ScratchBlocks from 'scratch-blocks';

import type { EditorInMessage } from '@scratch-mobile/shared';
import { postToReactNative } from './index';
import type { Workspace } from '../codegen/types';
import { insertStartHatBlockIfMissing } from '../workspace-custom/ensureStartHatBlock';
import { normalizeDefaultShadowReportersInWorkspaceState } from '../workspace-custom/normalizeWorkspaceShadows';
import { captureWorkspaceThumbnail } from '../workspace-custom/captureWorkspaceThumbnail';
import { refreshColoursFromParentInWorkspace } from '../blocks/portDropdownExtensions';

const WORKSPACE_SAVE_DEBOUNCE_MS = 1500;
/** 截图超时兜底：缩略图失败不得阻塞 workspace 保存 */
const THUMBNAIL_TIMEOUT_MS = 600;

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
  /** 上次发送的 workspace 序列化结果，用于内容级去重（区分“有事件”与“内容真的变了”） */
  let lastSentWorkspaceJson: string | null = null;
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

  async function flushWorkspaceChanged(force = false): Promise<void> {
    clearDebounceTimer();

    if (!activeProjectId) {
      return;
    }

    if (!force && !isWorkspaceHydrated) {
      return;
    }

    const serializedWorkspace = serializeWorkspace(workspace);
    const serializedJson = JSON.stringify(serializedWorkspace);
    // 内容级去重：workspace 未真正变化时不重复截图/发送。
    // force（flush 流程）仍重发轻量消息保留“最新状态已落盘”语义，但跳过截图。
    const contentUnchanged = serializedJson === lastSentWorkspaceJson;
    if (contentUnchanged && !force) {
      return;
    }
    lastSentWorkspaceJson = serializedJson;

    const blockCount = workspace.getAllBlocks(false).length;
    if (!force) {
      workspaceRevision += 1;
    }
    const revision = workspaceRevision;

    let thumbnail: string | undefined;
    if (!contentUnchanged) {
      let thumbnailTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
      const thumbnailTimeout = new Promise<undefined>(resolve => {
        thumbnailTimeoutTimer = setTimeout(() => {
          resolve(undefined);
        }, THUMBNAIL_TIMEOUT_MS);
      });

      thumbnail = await Promise.race([
        captureWorkspaceThumbnail(workspace).catch(() => undefined),
        thumbnailTimeout,
      ]);
      if (thumbnailTimeoutTimer != null) {
        clearTimeout(thumbnailTimeoutTimer);
      }
    }

    postToReactNative({
      type: 'editor.workspace.changed',
      projectId: activeProjectId,
      workspace: serializedWorkspace,
      blockCount,
      revision,
      thumbnail,
    });
  }

  function scheduleWorkspaceChanged(): void {
    if (!activeProjectId || !isWorkspaceHydrated) {
      return;
    }
    clearDebounceTimer();
    debounceTimer = setTimeout(() => {
      void flushWorkspaceChanged(false);
    }, WORKSPACE_SAVE_DEBOUNCE_MS);
  }

  function handleWorkspaceLoad(
    message: Extract<EditorInMessage, { type: 'editor.workspace.load' }>,
  ): void {
    isWorkspaceHydrated = false;
    setWorkspaceInteractionBlocked(true);
    clearDebounceTimer();

    activeProjectId = message.projectId;
    lastSentWorkspaceJson = null;
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
    void flushWorkspaceChanged(true);
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