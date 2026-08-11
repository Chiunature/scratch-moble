import { Events, renderManagement } from 'scratch-blocks';

import {
  isReactNativeHost,
  postToReactNative,
  type EditorInMessage,
} from '../../bridge/index';
import { createFieldSessionRegistry } from './sessionRegistry';

type RenderableBlock = {
  rendered?: boolean;
  queueRender?: () => void;
  getParent?: () => RenderableBlock | null;
};

/** 带 min/max 的 Scratch 数字字段（field_number 族） */
export type ScratchNumberField = {
  name?: string;
  workspace_: unknown;
  textContent_?: Text;
  getDisplayText_?: () => string;
  getValue(): string | number;
  setValue(value: string | number, fireChangeEvent?: boolean): void;
  getMin(): number;
  getMax(): number;
  getPrecision(): number;
  getSourceBlock(): {
    getColour?: () => string;
    getColourSecondary?: () => string;
    getColourTertiary?: () => string;
  } & RenderableBlock | null;
};

type SliderSession = {
  field: ScratchNumberField;
  valueWhenOpened: string | number | null;
};

const sessions = createFieldSessionRegistry<SliderSession>({ createSessionId });

function createSessionId(field: ScratchNumberField): string {
  const id = (field as unknown as { id_?: string }).id_;
  return id ? `field-${id}` : `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function refreshSliderFieldDisplay(field: ScratchNumberField): void {
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

function applySliderValueDuringDrag(field: ScratchNumberField, raw: number): void {
  field.setValue(raw, false);
  if (field.textContent_ && typeof field.getDisplayText_ === 'function') {
    field.textContent_.nodeValue = field.getDisplayText_();
  }
}

function fireFieldChangeIfNeeded(
  field: ScratchNumberField,
  oldValue: string | number | null,
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

/**
 * RN 主动关闭浮层时传 false，避免把 close 消息再回传形成回声。
 * Web 侧若将来主动取消会话，可传 true 让 RN 同步清理原生浮层。
 */
function closeSession(sessionId: string, notifyNativeHost: boolean): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  sessions.delete(sessionId);
  refreshSliderFieldDisplay(session.field);
  fireFieldChangeIfNeeded(session.field, session.valueWhenOpened);
  if (notifyNativeHost) {
    postToReactNative({ type: 'editor.numberSlider.close', sessionId });
  }
}

export function handleNumberSliderInbound(message: EditorInMessage): void {
  const session = sessions.get(message.sessionId);
  if (!session) {
    return;
  }

  if (message.type === 'editor.numberSlider.value') {
    const current = Number(session.field.getValue());
    if (!Number.isNaN(current) && current === message.value) {
      return;
    }
    applySliderValueDuringDrag(session.field, message.value);
    return;
  }

  closeSession(message.sessionId, false);
}

/** 在 RN WebView 中打开原生滑块浮层 */
export function openNumberSliderEditor(
  field: ScratchNumberField,
  _e?: Event,
): void {
  if (!isReactNativeHost()) {
    return;
  }

  if (sessions.findByField(field)) {
    return;
  }

  if (!field.getSourceBlock()) {
    return;
  }

  const sessionId = sessions.create({
    field,
    valueWhenOpened: field.getValue(),
  });

  const min = field.getMin();
  const max = field.getMax();
  const step = field.getPrecision() || 1;
  let value = Number(field.getValue());
  if (Number.isNaN(value)) {
    value = min > -Infinity ? min : 0;
  }

  postToReactNative({
    type: 'editor.numberSlider.open',
    sessionId,
    min,
    max,
    step,
    value,
  });
}
