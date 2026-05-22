import { Events, FieldDropdown, renderManagement } from 'scratch-blocks';

import {
  isReactNativeHost,
  postToReactNative,
  type EditorInMessage,
} from '../../bridge';

type RenderableBlock = {
  rendered?: boolean;
  queueRender?: () => void;
  getParent?: () => RenderableBlock | null;
};

/** 端口下拉字段（field_port_picker） */
export type ScratchPortField = {
  name?: string;
  workspace_: unknown;
  textContent_?: Text;
  getDisplayText_?: () => string;
  getValue(): string;
  setValue(value: string, fireChangeEvent?: boolean): void;
  getSourceBlock(): {
    getColour?: () => string;
    getColourSecondary?: () => string;
    getColourTertiary?: () => string;
  } & RenderableBlock | null;
};

type PortPickerSession = {
  field: ScratchPortField;
  valueWhenOpened: string | null;
};

const sessions = new Map<string, PortPickerSession>();

const fieldDropdownShowEditor = (
  FieldDropdown.prototype as unknown as {
    showEditor_: (this: unknown, e?: Event) => void;
  }
).showEditor_;

function createSessionId(field: ScratchPortField): string {
  const id = (field as unknown as { id_?: string }).id_;
  return id ? `field-${id}` : `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function refreshPortFieldDisplay(field: ScratchPortField): void {
  if (field.textContent_ && typeof field.getDisplayText_ === 'function') {
    field.textContent_.nodeValue = field.getDisplayText_();
  }

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

function applyPortValue(field: ScratchPortField, value: string): void {
  field.setValue(value, false);
  if (field.textContent_ && typeof field.getDisplayText_ === 'function') {
    field.textContent_.nodeValue = field.getDisplayText_();
  }
}

function fireFieldChangeIfNeeded(
  field: ScratchPortField,
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

function getFieldAnchorRect(
  field: ScratchPortField,
): { x: number; y: number; width: number; height: number } | null {
  const target = (
    field as unknown as { getClickTarget_?: () => Element | null }
  ).getClickTarget_?.();
  if (!target || typeof target.getBoundingClientRect !== 'function') {
    return null;
  }
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function coloursFromField(field: ScratchPortField): {
  primary: string;
  secondary: string;
} {
  const block = field.getSourceBlock();
  const primary =
    (block && typeof block.getColour === 'function' && block.getColour()) ||
    '#4C97FF';
  const secondary =
    (block &&
      typeof block.getColourSecondary === 'function' &&
      block.getColourSecondary()) ||
    primary;
  return { primary, secondary };
}

function closeSession(sessionId: string, notifyNativeHost: boolean): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  sessions.delete(sessionId);
  refreshPortFieldDisplay(session.field);
  fireFieldChangeIfNeeded(session.field, session.valueWhenOpened);
  if (notifyNativeHost) {
    postToReactNative({ type: 'editor.portPicker.close', sessionId });
  }
}

export function handlePortPickerInbound(message: EditorInMessage): void {
  if (
    message.type !== 'editor.portPicker.value' &&
    message.type !== 'editor.portPicker.close'
  ) {
    return;
  }

  const session = sessions.get(message.sessionId);
  if (!session) {
    return;
  }

  if (message.type === 'editor.portPicker.value') {
    applyPortValue(session.field, message.value);
    return;
  }

  closeSession(message.sessionId, false);
}

/** 在 RN WebView 中打开原生端口选择浮层；非 RN 回退 Blockly 下拉菜单 */
export function openPortPickerEditor(
  field: ScratchPortField,
  e?: Event,
): void {
  if (!isReactNativeHost()) {
    fieldDropdownShowEditor.call(field, e);
    return;
  }

  for (const [, session] of sessions) {
    if (session.field === field) {
      return;
    }
  }

  const anchor = getFieldAnchorRect(field);
  const block = field.getSourceBlock();
  if (!anchor || !block) {
    return;
  }

  const sessionId = createSessionId(field);
  sessions.set(sessionId, {
    field,
    valueWhenOpened: field.getValue(),
  });

  postToReactNative({
    type: 'editor.portPicker.open',
    sessionId,
    value: String(field.getValue()),
    anchor,
    colors: coloursFromField(field),
  });
}
