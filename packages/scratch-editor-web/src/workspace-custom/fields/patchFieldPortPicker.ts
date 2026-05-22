import { FieldDropdown, fieldRegistry } from 'scratch-blocks';

import { openPortPickerEditor, type ScratchPortField } from './portPickerEditor';

let fieldsRegistered = false;

/**
 * Blockly `FieldDropdown` 在 fromJson / 构造时强制要求 options。
 * 仅用于 Web 字段初始化与非 RN 时的浏览器回退菜单；RN 选择 UI 见 portPickerOptions.ts。
 */
const BLOCKLY_PORT_OPTIONS: [string, string][] = Array.from(
  { length: 8 },
  (_, i) => {
    const s = String(i);
    return [s, s];
  },
);

function registerPortPickerField(): void {
  if (fieldsRegistered) {
    return;
  }
  fieldsRegistered = true;

  class FieldPortPicker extends FieldDropdown {
    /** 与 FieldDropdown.fromJson 一致：`(menuOptions, validator, config)`，value 在 config 里 */
    static fromJson(options: Record<string, unknown>): FieldPortPicker {
      const value =
        typeof options.value === 'string' ? options.value : '0';
      return new FieldPortPicker(BLOCKLY_PORT_OPTIONS, undefined, {
        ...options,
        value,
      } as never);
    }

    showEditor_(e?: Event): void {
      openPortPickerEditor(this as unknown as ScratchPortField, e);
    }

    /** 显示当前端口值；RN 侧选项列表单独维护 */
    getDisplayText_(): string {
      return String(this.getValue());
    }
  }

  fieldRegistry.register(
    'field_port_picker',
    FieldPortPicker as unknown as typeof FieldDropdown,
  );
}

/**
 * 注册 RN 端口选择字段。
 * 须在 `ScratchBlocks.inject()` 之前或之后均可调用（与 inject 无耦合）。
 */
export function patchFieldPortPicker(): void {
  registerPortPickerField();
}
