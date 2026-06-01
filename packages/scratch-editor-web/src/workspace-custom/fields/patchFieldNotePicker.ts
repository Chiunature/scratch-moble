import { FieldDropdown, fieldRegistry } from 'scratch-blocks';

import { clampNotePitch } from '@scratch-mobile/shared';

import {
  formatNoteLabel,
  openNotePickerEditor,
  type ScratchNotePickerField,
} from './notePickerEditor';

let fieldsRegistered = false;

/** 占位选项；实际显示由 getText_ / getDisplayText_ 覆盖为音名 */
const NOTE_PICKER_OPTIONS: [string, string][] = Array.from(
  { length: 37 },
  (_, i) => {
    const s = String(i);
    return [s, s];
  },
);

function registerNotePickerField(): void {
  if (fieldsRegistered) {
    return;
  }
  fieldsRegistered = true;

  class FieldNotePicker extends FieldDropdown {
    static fromJson(options: Record<string, unknown>): FieldNotePicker {
      const rawValue =
        typeof options.value === 'string' ? options.value : '12';
      return new FieldNotePicker(NOTE_PICKER_OPTIONS, undefined, {
        ...options,
        value: String(clampNotePitch(Number(rawValue))),
      } as never);
    }

    showEditor_(e?: Event): void {
      openNotePickerEditor(this as unknown as ScratchNotePickerField, e);
    }

    doClassValidation_(newValue?: string | null): string | null {
      if (newValue == null || newValue === '') {
        return '12';
      }
      const pitch = Number(newValue);
      if (!Number.isFinite(pitch)) {
        return '12';
      }
      return String(clampNotePitch(pitch));
    }

    getText_(): string {
      return formatNoteLabel(String(this.getValue()));
    }

    getDisplayText_(): string {
      return this.getText_();
    }
  }

  fieldRegistry.register(
    'field_note_picker',
    FieldNotePicker as unknown as typeof FieldDropdown,
  );
}

export function patchFieldNotePicker(): void {
  registerNotePickerField();
}
