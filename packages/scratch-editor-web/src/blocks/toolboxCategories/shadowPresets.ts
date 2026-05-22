import { BLOCK_TYPES } from '../blockTypes';

/** toolbox `inputs.<name>.shadow`：单选端口（0–7） */
export function portShadow(port: string | number = '0') {
  return {
    type: BLOCK_TYPES.common.portDropdown,
    fields: { PORT: String(port) },
  } as const;
}

/**
 * toolbox 多选端口阴影：type 仍为 port_dropdown，PORT 为 "0,1"。
 * 字段在 setValue/doClassValidation 时根据逗号自动切为多选（见 patchFieldPortPicker）。
 */
export function portShadowMulti(
  ports: [string | number, string | number] = ['0', '1'],
) {
  return {
    type: BLOCK_TYPES.common.portDropdown,
    fields: { PORT: ports.map(String).join(',') },
  } as const;
}

/** toolbox `inputs.<name>.shadow`：整数滑块（范围/步长在 numberShadowReporters 定义） */
export function integerSliderShadow(num: number) {
  return {
    type: BLOCK_TYPES.common.integerSlider,
    fields: { NUM: num },
  } as const;
}

/** toolbox `inputs.<name>.shadow`：小数滑块 */
export function decimalSliderShadow(num: number) {
  return {
    type: BLOCK_TYPES.common.decimalSlider,
    fields: { NUM: num },
  } as const;
}

/** toolbox `inputs.<name>.shadow`：非负整数键盘 */
export function positiveKeyboardShadow(num: number) {
  return {
    type: BLOCK_TYPES.common.positiveKeyboard,
    fields: { NUM: num },
  } as const;
}
