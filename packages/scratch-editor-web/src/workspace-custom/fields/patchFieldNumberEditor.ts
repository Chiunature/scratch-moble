import { FieldNumber, fieldRegistry } from 'scratch-blocks';

import { openNumberSliderEditor, type ScratchNumberField } from './numberSliderEditor';
import {
  openScratchNumberKeyboardEditor,
  tuneKeyboardFieldInput,
} from './patchFieldNumberMobileKeyboard';

let fieldsRegistered = false;

function registerNumberFieldVariants(): void {
  if (fieldsRegistered) {
    return;
  }
  fieldsRegistered = true;

  class FieldNumberSlider extends FieldNumber {
    showEditor_(e?: Event): void {
      openNumberSliderEditor(this as unknown as ScratchNumberField, e);
    }
  }

  class FieldNumberKeyboard extends FieldNumber {
    showEditor_(e?: PointerEvent): void {
      openScratchNumberKeyboardEditor(this as unknown as ScratchNumberField, e);
    }

    widgetCreate_(): HTMLInputElement {
      const input = super.widgetCreate_();
      tuneKeyboardFieldInput(input);
      return input;
    }
  }

  fieldRegistry.register('field_number_slider', FieldNumberSlider);
  fieldRegistry.register('field_number_keyboard', FieldNumberKeyboard);
}

/**
 * 注册滑块/键盘数字字段。
 * 须在 `ScratchBlocks.inject()` 之前或之后均可调用（与 inject 无耦合）。
 */
export function patchFieldNumberEditor(): void {
  registerNumberFieldVariants();
}
