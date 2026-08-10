import { renderManagement } from 'scratch-blocks';

import { serializeMatrixLightRows } from '@scratch-mobile/shared';

import {
  isReactNativeHost,
  postToReactNative,
  type EditorInMessage,
} from '../../bridge/index';

type RenderableBlock = {
  rendered?: boolean;
  queueRender?: () => void;
  getParent?: () => RenderableBlock | null;
};

export type ScratchMatrixLightField = {
  name?: string;
  workspace_: unknown;
  getValue(): string;
  setValue(value: string, fireChangeEvent?: boolean): void;
  getSourceBlock(): {
    getColour?: () => string;
    getColourSecondary?: () => string;
    getColourTertiary?: () => string;
  } & RenderableBlock | null;
  updateMatrix_?: (valueOverride?: string) => void;
};

type MatrixLightSession = {
  field: ScratchMatrixLightField;
};

const sessions = new Map<string, MatrixLightSession>();

/** 400ms 内同一 field 只 post 一次 open（含 pointerdown / showEditor_ / reopen） */
const RN_OPEN_SUPPRESS_MS = 400;
const rnLastOpenAt = new WeakMap<ScratchMatrixLightField, number>();

function shouldSuppressDuplicateRnOpen(
  field: ScratchMatrixLightField,
): boolean {
  const now = performance.now();
  const last = rnLastOpenAt.get(field) ?? 0;
  if (now - last < RN_OPEN_SUPPRESS_MS) {
    return true;
  }
  rnLastOpenAt.set(field, now);
  return false;
}

function createSessionId(field: ScratchMatrixLightField): string {
  const id = (field as unknown as { id_?: string }).id_;
  return id ? `field-${id}` : `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findSessionEntryForField(
  field: ScratchMatrixLightField,
): [string, MatrixLightSession] | null {
  for (const [sessionId, session] of sessions) {
    if (session.field === field) {
      return [sessionId, session];
    }
  }
  return null;
}

function refreshMatrixFieldDisplay(field: ScratchMatrixLightField): void {
  field.updateMatrix_?.();

  const block = field.getSourceBlock();
  if (block?.rendered && typeof block.queueRender === 'function') {
    block.queueRender();
    const parent = block.getParent?.();
    if (parent?.rendered && typeof parent.queueRender === 'function') {
      parent.queueRender();
    }
  }

  renderManagement.triggerQueuedRenders();
}

function commitSession(
  sessionId: string,
  rows: string,
  notifyCodeGenerationNeeded: () => void,
): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  sessions.delete(sessionId);
  session.field.setValue(serializeMatrixLightRows(rows), true);
  refreshMatrixFieldDisplay(session.field);
  notifyCodeGenerationNeeded();
}

function closeSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function handleMatrixLightInbound(
  message: EditorInMessage,
  notifyCodeGenerationNeeded: () => void,
): void {
  if (
    message.type !== 'editor.matrixLight.commit' &&
    message.type !== 'editor.matrixLight.close'
  ) {
    return;
  }

  if (message.type === 'editor.matrixLight.commit') {
    commitSession(message.sessionId, message.rows, notifyCodeGenerationNeeded);
    return;
  }

  closeSession(message.sessionId);
}

/** 矩阵灯编辑仅由 RN Overlay 提供；非 RN WebView 中点击 field 不打开编辑器 */
export function openMatrixLightEditor(
  field: ScratchMatrixLightField,
  _e?: Event,
): void {
  if (!isReactNativeHost()) {
    return;
  }

  if (shouldSuppressDuplicateRnOpen(field)) {
    return;
  }

  const block = field.getSourceBlock();
  if (!block) {
    return;
  }

  const rows = field.getValue();
  const existing = findSessionEntryForField(field);
  if (existing) {
    const [sessionId] = existing;
    // 首次 open 可能 RN 未挂上浮层；再次点击须重发 postMessage，不能静默 return
    postToReactNative({
      type: 'editor.matrixLight.open',
      sessionId,
      rows,
    });
    return;
  }

  const sessionId = createSessionId(field);
  sessions.set(sessionId, { field });
  postToReactNative({
    type: 'editor.matrixLight.open',
    sessionId,
    rows,
  });
}
