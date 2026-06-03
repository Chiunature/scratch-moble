import { Events, renderManagement } from 'scratch-blocks';
import { normalizeHandleShankKey } from '@scratch-mobile/shared';

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

export type ScratchHandleShankField = {
  name?: string;
  workspace_: unknown;
  getValue(): string;
  setValue(value: string, fireChangeEvent?: boolean): void;
  getSourceBlock(): RenderableBlock & {
    getColour?: () => string;
  } | null;
};

type HandleShankSession = {
  field: ScratchHandleShankField;
  valueWhenOpened: string | null;
};

const sessions = new Map<string, HandleShankSession>();

const RN_OPEN_SUPPRESS_MS = 400;
const rnLastOpenAt = new WeakMap<ScratchHandleShankField, number>();

function shouldSuppressDuplicateRnOpen(
  field: ScratchHandleShankField,
): boolean {
  const now = performance.now();
  const last = rnLastOpenAt.get(field) ?? 0;
  if (now - last < RN_OPEN_SUPPRESS_MS) {
    return true;
  }
  rnLastOpenAt.set(field, now);
  return false;
}

function createSessionId(field: ScratchHandleShankField): string {
  const id = (field as unknown as { id_?: string }).id_;
  return id
    ? `field-${id}`
    : `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findSessionEntryForField(
  field: ScratchHandleShankField,
): [string, HandleShankSession] | null {
  for (const [sessionId, session] of sessions) {
    if (session.field === field) {
      return [sessionId, session];
    }
  }
  return null;
}

function refreshHandleShankFieldDisplay(field: ScratchHandleShankField): void {
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

function fireFieldChangeIfNeeded(
  field: ScratchHandleShankField,
  oldValue: string | null,
): void {
  const block = field.getSourceBlock();
  const newValue = field.getValue();
  if (!block || oldValue === newValue) {
    return;
  }
  if (Events.isEnabled()) {
    Events.fire(
      new Events.BlockChange(
        block as ConstructorParameters<typeof Events.BlockChange>[0],
        'field',
        field.name ?? null,
        oldValue,
        newValue,
      ),
    );
  }
}

function closeSession(sessionId: string, notifyNativeHost: boolean): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  sessions.delete(sessionId);
  refreshHandleShankFieldDisplay(session.field);
  fireFieldChangeIfNeeded(session.field, session.valueWhenOpened);
  if (notifyNativeHost) {
    postToReactNative({ type: 'editor.handleShank.close', sessionId });
  }
}

export function handleHandleShankInbound(message: EditorInMessage): void {
  if (
    message.type !== 'editor.handleShank.commit' &&
    message.type !== 'editor.handleShank.close'
  ) {
    return;
  }

  const session = sessions.get(message.sessionId);
  if (!session) {
    return;
  }

  if (message.type === 'editor.handleShank.commit') {
    session.field.setValue(normalizeHandleShankKey(message.value), false);
    sessions.delete(message.sessionId);
    refreshHandleShankFieldDisplay(session.field);
    fireFieldChangeIfNeeded(session.field, session.valueWhenOpened);
    return;
  }

  closeSession(message.sessionId, false);
}

export function openHandleShankPickerEditor(
  field: ScratchHandleShankField,
  _e?: Event,
): boolean {
  if (!isReactNativeHost()) {
    return false;
  }

  if (shouldSuppressDuplicateRnOpen(field)) {
    return true;
  }

  if (!field.getSourceBlock()) {
    return true;
  }

  const rawValue = field.getValue();
  const value = normalizeHandleShankKey(rawValue);

  const existing = findSessionEntryForField(field);
  if (existing) {
    const [sessionId] = existing;
    postToReactNative({
      type: 'editor.handleShank.open',
      sessionId,
      value,
    });
    return true;
  }

  const sessionId = createSessionId(field);
  sessions.set(sessionId, { field, valueWhenOpened: rawValue });

  postToReactNative({
    type: 'editor.handleShank.open',
    sessionId,
    value,
  });
  return true;
}