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

/** toolbox `inputs.<name>.shadow`：字符串（Scratch 内置 text reporter） */
export function stringShadow(text: string) {
  return {
    type: 'text',
    fields: { TEXT: text },
  } as const;
}

/**
 * toolbox `inputs.X.shadow`：矩阵灯列坐标（0 ~ 列数-1）。
 * `num` 为阴影块字段 NUM 的初值，不是选项个数。
 */
export function basicDropdownNumColShadow(num: string | number = 0) {
  return {
    type: BLOCK_TYPES.common.basicDropdownNumCol,
    fields: { NUM: String(num) },
  } as const;
}

/**
 * toolbox `inputs.Y.shadow`：矩阵灯行坐标（0 ~ 行数-1）。
 * `num` 为阴影块字段 NUM 的初值，不是选项个数。
 */
export function basicDropdownNumRowShadow(num: string | number = 0) {
  return {
    type: BLOCK_TYPES.common.basicDropdownNumRow,
    fields: { NUM: String(num) },
  } as const;
}
