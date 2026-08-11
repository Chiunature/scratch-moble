import { Events, renderManagement } from 'scratch-blocks';

import { clampNotePitch, pitchToDisplayName } from '@scratch-mobile/shared';

import {
  isReactNativeHost,
  postToReactNative,
  type EditorInMessage,
} from '../../bridge/index';
import {
  createFieldSessionRegistry,
  createRnOpenSuppressor,
} from './sessionRegistry';

type RenderableBlock = {
  rendered?: boolean;
  queueRender?: () => void;
  getParent?: () => RenderableBlock | null;
};

export type ScratchNotePickerField = {
  name?: string;
  workspace_: unknown;
  getValue(): string;
  setValue(value: string, fireChangeEvent?: boolean): void;
  getSourceBlock(): RenderableBlock & {
    getColour?: () => string;
  } | null;
};

type NotePickerSession = {
  field: ScratchNotePickerField;
  valueWhenOpened: string | null;
};

const sessions = createFieldSessionRegistry<NotePickerSession>({
  createSessionId,
});

/** 400ms 内同一 field 只 post 一次 open（含 pointerdown / showEditor_ / reopen） */
const shouldSuppressDuplicateRnOpen =
  createRnOpenSuppressor<ScratchNotePickerField>();

function createSessionId(field: ScratchNotePickerField): string {
  const id = (field as unknown as { id_?: string }).id_;
  return id
    ? `field-${id}`
    : `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function refreshNoteFieldDisplay(field: ScratchNotePickerField): void {
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
  field: ScratchNotePickerField,
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
  refreshNoteFieldDisplay(session.field);
  fireFieldChangeIfNeeded(session.field, session.valueWhenOpened);
  if (notifyNativeHost) {
    postToReactNative({ type: 'editor.notePicker.close', sessionId });
  }
}

export function handleNotePickerInbound(message: EditorInMessage): void {
  if (
    message.type !== 'editor.notePicker.commit' &&
    message.type !== 'editor.notePicker.close'
  ) {
    return;
  }

  const session = sessions.get(message.sessionId);
  if (!session) {
    return;
  }

  if (message.type === 'editor.notePicker.commit') {
    const clamped = String(clampNotePitch(message.value));
    session.field.setValue(clamped, false);
    sessions.delete(message.sessionId);
    refreshNoteFieldDisplay(session.field);
    fireFieldChangeIfNeeded(session.field, session.valueWhenOpened);
    return;
  }

  closeSession(message.sessionId, false);
}

/** 音符编辑仅由 RN Overlay 提供；非 RN WebView 中点击 field 不打开编辑器 */
export function openNotePickerEditor(
  field: ScratchNotePickerField,
  _e?: Event,
): void {
  if (!isReactNativeHost()) {
    return;
  }

  if (shouldSuppressDuplicateRnOpen(field)) {
    return;
  }

  if (!field.getSourceBlock()) {
    return;
  }

  const rawValue = field.getValue();
  const pitch = clampNotePitch(Number(rawValue));

  const existing = sessions.findByField(field);
  if (existing) {
    const { sessionId } = existing;
    // 首次 open 可能 RN 未挂上浮层；再次点击须重发 postMessage，不能静默 return
    postToReactNative({
      type: 'editor.notePicker.open',
      sessionId,
      value: pitch,
    });
    return;
  }

  const sessionId = sessions.create({ field, valueWhenOpened: rawValue });

  postToReactNative({
    type: 'editor.notePicker.open',
    sessionId,
    value: pitch,
  });
}

/** 供 patchFieldNotePicker 调用，将 pitch 转为音名显示文本 */
export function formatNoteLabel(raw: string): string {
  const pitch = Number(raw);
  if (!Number.isFinite(pitch)) {
    return raw;
  }
  return pitchToDisplayName(clampNotePitch(pitch));
}
