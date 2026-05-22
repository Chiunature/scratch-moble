import { Events, FieldDropdown, renderManagement } from 'scratch-blocks';

import {
  coercePortFieldValue,
  parsePortFieldValue,
  type PortSelectionMode,
} from '@scratch-mobile/shared';

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

export type ScratchPortField = {
  name?: string;
  workspace_: unknown;
  getDisplayText_?: () => string;
  getValue(): string;
  setValue(value: string, fireChangeEvent?: boolean): void;
  selectionMode_?: PortSelectionMode;
  maxSelections_?: number;
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

function getFieldPortConfig(field: ScratchPortField): {
  mode: PortSelectionMode;
  maxSelections: number;
} {
  if (field.selectionMode_ === 'multi') {
    return {
      mode: 'multi',
      maxSelections: field.maxSelections_ ?? 2,
    };
  }
  const ports = parsePortFieldValue(String(field.getValue()));
  if (ports.length > 1) {
    return { mode: 'multi', maxSelections: field.maxSelections_ ?? 2 };
  }
  return { mode: 'single', maxSelections: 1 };
}

function createSessionId(field: ScratchPortField): string {
  const id = (field as unknown as { id_?: string }).id_;
  return id ? `field-${id}` : `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function refreshPortFieldDisplay(field: ScratchPortField): void {
  if (typeof field.getDisplayText_ === 'function') {
    const block = field.getSourceBlock();
    const text = field.getDisplayText_();
    const fieldInstance = field as unknown as { textContent_?: Text };
    if (fieldInstance.textContent_) {
      fieldInstance.textContent_.nodeValue = text;
    }
    if (block?.rendered && typeof block.queueRender === 'function') {
      block.queueRender();
      const parent = block.getParent?.();
      if (parent?.rendered && typeof parent.queueRender === 'function') {
        parent.queueRender();
      }
    }
    renderManagement.triggerQueuedRenders();
  }
}

function applyPortValue(field: ScratchPortField, value: string): void {
  const { mode, maxSelections } = getFieldPortConfig(field);
  field.setValue(coercePortFieldValue(value, { mode, maxSelections }), false);
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
    refreshPortFieldDisplay(session.field);
    fireFieldChangeIfNeeded(session.field, session.valueWhenOpened);
    return;
  }

  closeSession(message.sessionId, false);
}

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

  if (!field.getSourceBlock()) {
    return;
  }

  const { mode, maxSelections } = getFieldPortConfig(field);
  const value = coercePortFieldValue(String(field.getValue()), {
    mode,
    maxSelections,
  });

  const sessionId = createSessionId(field);
  sessions.set(sessionId, {
    field,
    valueWhenOpened: field.getValue(),
  });

  postToReactNative({
    type: 'editor.portPicker.open',
    sessionId,
    value,
    maxSelections,
  });
}
