import { FieldDropdown, fieldRegistry } from 'scratch-blocks';

import {
  coercePortFieldValue,
  formatPortFieldDisplay,
  parsePortFieldValue,
  type PortSelectionMode,
} from '@scratch-mobile/shared';

import { openPortPickerEditor, type ScratchPortField } from './portPickerEditor';

let fieldsRegistered = false;

const BLOCKLY_PORT_OPTIONS: [string, string][] = Array.from(
  { length: 8 },
  (_, i) => {
    const s = String(i);
    return [s, s];
  },
);

function readSelectionMode(options: Record<string, unknown>): PortSelectionMode {
  if (options.selectionMode === 'multi') {
    return 'multi';
  }
  const value = typeof options.value === 'string' ? options.value : '';
  if (value.includes(',')) {
    return 'multi';
  }
  return 'single';
}

function readMaxSelections(
  options: Record<string, unknown>,
  mode: PortSelectionMode,
): number {
  const raw = options.maxSelections;
  if (typeof raw === 'number' && raw >= 1) {
    return Math.floor(raw);
  }
  return mode === 'multi' ? 2 : 1;
}

function fieldCoerceOpts(field: {
  selectionMode_?: PortSelectionMode;
  maxSelections_?: number;
}): { mode: PortSelectionMode; maxSelections: number } {
  const mode = field.selectionMode_ ?? 'single';
  return { mode, maxSelections: field.maxSelections_ ?? (mode === 'multi' ? 2 : 1) };
}

/** 逗号初值（如 portShadowMulti）须在 coerce 前升级为多选，否则会被截成单个端口。 */
function applyMultiFromRawValue(
  field: FieldPortPicker,
  raw: string,
): void {
  const trimmed = raw.trim();
  if (!trimmed.includes(',')) {
    return;
  }
  const ports = parsePortFieldValue(trimmed);
  if (ports.length > 1) {
    field.selectionMode_ = 'multi';
    field.maxSelections_ = Math.max(field.maxSelections_, 2);
  }
}

function registerPortPickerField(): void {
  if (fieldsRegistered) {
    return;
  }
  fieldsRegistered = true;

  class FieldPortPicker extends FieldDropdown {
    selectionMode_: PortSelectionMode = 'single';
    maxSelections_ = 1;

    static fromJson(options: Record<string, unknown>): FieldPortPicker {
      const selectionMode = readSelectionMode(options);
      const maxSelections = readMaxSelections(options, selectionMode);
      const rawValue =
        typeof options.value === 'string' ? options.value : '0';
      const field = new FieldPortPicker(BLOCKLY_PORT_OPTIONS, undefined, {
        ...options,
        value: coercePortFieldValue(rawValue, { mode: selectionMode, maxSelections }),
      } as never);
      field.selectionMode_ = selectionMode;
      field.maxSelections_ = maxSelections;
      return field;
    }

    showEditor_(e?: Event): void {
      openPortPickerEditor(this as unknown as ScratchPortField, e);
    }

    doClassValidation_(newValue?: string | null): string | null {
      if (newValue == null || newValue === '') {
        const opts = fieldCoerceOpts(this);
        return coercePortFieldValue('0', opts);
      }
      const raw = String(newValue);
      applyMultiFromRawValue(this, raw);
      const opts = fieldCoerceOpts(this);
      return coercePortFieldValue(raw, opts);
    }

    getText_(): string {
      return formatPortFieldDisplay(String(this.getValue()));
    }

    getDisplayText_(): string {
      return this.getText_();
    }
  }

  fieldRegistry.register(
    'field_port_picker',
    FieldPortPicker as unknown as typeof FieldDropdown,
  );
}

export function patchFieldPortPicker(): void {
  registerPortPickerField();
}
