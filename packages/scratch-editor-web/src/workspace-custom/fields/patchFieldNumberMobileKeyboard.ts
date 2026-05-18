import { FieldTextInput } from 'scratch-blocks';

import type { ScratchNumberField } from './numberSliderEditor';

/**
 * 移动端 Scratch 数字槽键盘策略（仅用于 `field_number_keyboard`）。
 *
 * | 模式 | 行为 |
 * |------|------|
 * | `numpad-only` | 触摸：inline 输入 + 拦截 `select()` + `inputmode=none`，尽量不叠系统键盘 |
 * | `system-only` | 始终走 `FieldTextInput.showEditor_(e, false)`，只用系统键盘 |
 */
export type ScratchNumberKeyboardMode = 'numpad-only' | 'system-only';

type ScratchNumberFieldWithInput = ScratchNumberField & {
  htmlInput_: HTMLInputElement | null;
};

const fieldTextShowEditor = (
  FieldTextInput.prototype as unknown as {
    showEditor_: (this: unknown, e?: Event, quietInput?: boolean) => void;
  }
).showEditor_;

const fieldNumberShowEditor = (
  FieldTextInput.prototype as unknown as {
    showEditor_: (this: unknown, e?: Event, quietInput?: boolean) => void;
  }
).showEditor_;

// ---------------------------------------------------------------------------
// HTMLInputElement#select 守卫（仅 numpad-only 安装）
// ---------------------------------------------------------------------------
const selectGuard = {
  saved: null as typeof HTMLInputElement.prototype.select | null,
  fn: null as typeof HTMLInputElement.prototype.select | null,
  skip: false,
};

function installSelectGuard(): void {
  if (selectGuard.fn) {
    HTMLInputElement.prototype.select = selectGuard.fn;
    return;
  }
  selectGuard.saved ??= HTMLInputElement.prototype.select;
  selectGuard.fn = function (this: HTMLInputElement) {
    if (selectGuard.skip && this.classList.contains('blocklyHtmlInput')) {
      return;
    }
    return selectGuard.saved!.call(this);
  };
  HTMLInputElement.prototype.select = selectGuard.fn;
}

function uninstallSelectGuard(): void {
  if (selectGuard.fn && HTMLInputElement.prototype.select === selectGuard.fn) {
    HTMLInputElement.prototype.select = selectGuard.saved!;
  }
}

function withSelectGuardSkipped(run: () => void): void {
  selectGuard.skip = true;
  try {
    run();
  } finally {
    selectGuard.skip = false;
  }
}

function tuneInputForNumPad(input: HTMLInputElement): void {
  input.readOnly = false;
  input.setAttribute('inputmode', 'none');
}

/** 为 keyboard 字段的 inline input 设 decimal 键盘布局 */
export function tuneKeyboardFieldInput(input: HTMLInputElement): void {
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
}

let keyboardMode: ScratchNumberKeyboardMode = 'numpad-only';

export function setScratchNumberKeyboardMode(
  mode: ScratchNumberKeyboardMode,
): void {
  keyboardMode = mode;
  if (mode === 'system-only') {
    uninstallSelectGuard();
  }
}

/**
 * 打开键盘编辑 UI（inline 或系统键盘）。不用于 `field_number_slider`。
 */
export function openScratchNumberKeyboardEditor(
  field: ScratchNumberField,
  e?: PointerEvent,
): void {
  if (keyboardMode === 'system-only') {
    fieldTextShowEditor.call(field, e, false);
    const input = (field as ScratchNumberFieldWithInput).htmlInput_;
    if (input) {
      tuneKeyboardFieldInput(input);
    }
    return;
  }

  installSelectGuard();
  if (e?.pointerType === 'touch') {
    withSelectGuardSkipped(() => fieldNumberShowEditor.call(field, e));
    const input = (field as ScratchNumberFieldWithInput).htmlInput_;
    if (input) {
      tuneInputForNumPad(input);
    }
    return;
  }

  fieldNumberShowEditor.call(field, e);
  const input = (field as ScratchNumberFieldWithInput).htmlInput_;
  if (input) {
    tuneKeyboardFieldInput(input);
  }
}
