import { FieldDropdown, fieldRegistry } from 'scratch-blocks';
import {
  HANDLE_SHANK_KEYS,
  HANDLE_SHANK_KEY_LABELS,
  normalizeHandleShankKey,
  type HandleShankKey,
} from '@scratch-mobile/shared';

import {
  openHandleShankPickerEditor,
  type ScratchHandleShankField,
} from './handleShankPickerEditor';

let fieldsRegistered = false;

const HANDLE_SHANK_OPTIONS: [string, string][] = HANDLE_SHANK_KEYS.map(k => [
  HANDLE_SHANK_KEY_LABELS[k],
  k,
]);

function registerHandleShankPickerField(): void {
  if (fieldsRegistered) {
    return;
  }
  fieldsRegistered = true;

  class FieldHandleShankPicker extends FieldDropdown {
    static fromJson(options: Record<string, unknown>): FieldHandleShankPicker {
      const rawValue =
        typeof options.value === 'string' ? options.value : 'up';
      const valid = normalizeHandleShankKey(rawValue);
      return new FieldHandleShankPicker(HANDLE_SHANK_OPTIONS, undefined, {
        ...options,
        value: valid,
      } as never);
    }

    showEditor_(e?: Event): void {
      const handledByNative = openHandleShankPickerEditor(
        this as unknown as ScratchHandleShankField,
        e,
      );
      if (!handledByNative) {
        super.showEditor_(e);
      }
    }

    doClassValidation_(newValue?: string | null): string | null {
      return normalizeHandleShankKey(newValue);
    }

    getText_(): string {
      const value = normalizeHandleShankKey(String(this.getValue())) as HandleShankKey;
      return HANDLE_SHANK_KEY_LABELS[value];
    }

    getDisplayText_(): string {
      return this.getText_();
    }
  }

  fieldRegistry.register(
    'field_handle_shank_picker',
    FieldHandleShankPicker as unknown as typeof FieldDropdown,
  );
}

export function patchFieldHandleShankPicker(): void {
  registerHandleShankPickerField();
}