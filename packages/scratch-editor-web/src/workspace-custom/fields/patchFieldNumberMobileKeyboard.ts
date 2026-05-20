import { FieldTextInput } from 'scratch-blocks';

import type { ScratchNumberField } from './numberSliderEditor';

type ScratchNumberFieldWithInput = ScratchNumberField & {
  htmlInput_: HTMLInputElement | null;
};

const fieldTextShowEditor = (
  FieldTextInput.prototype as unknown as {
    showEditor_: (this: unknown, e?: Event, quietInput?: boolean) => void;
  }
).showEditor_;

/** 为 keyboard 字段的 inline input 设 decimal 键盘布局 */
export function tuneKeyboardFieldInput(input: HTMLInputElement): void {
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
}

/**
 * 打开系统键盘编辑 UI。仅用于 `field_number_keyboard`，不用于 `field_number_slider`。
 */
export function openScratchNumberKeyboardEditor(
  field: ScratchNumberField,
  e?: PointerEvent,
): void {
  fieldTextShowEditor.call(field, e, false);
  const input = (field as ScratchNumberFieldWithInput).htmlInput_;
  if (input) {
    tuneKeyboardFieldInput(input);
  }
}
