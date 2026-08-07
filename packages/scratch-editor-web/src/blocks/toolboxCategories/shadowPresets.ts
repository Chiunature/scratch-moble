import { normalizeHandleShankKey } from '@scratch-mobile/shared';

import { BLOCK_TYPES } from '../blockTypes';

/** toolbox `inputs.<name>.shadow`：传感器单选端口（A-D，值 0-3） */
export function portShadow(port: string | number = '0') {
  return {
    type: BLOCK_TYPES.common.portDropdown,
    fields: { PORT: String(port) },
  } as const;
}

/** toolbox `inputs.<name>.shadow`：电机单选端口（E-H，值 4-7） */
export function motorPortShadow(port: string | number = '4') {
  return {
    type: BLOCK_TYPES.common.motorPortDropdown,
    fields: { PORT: String(port) },
  } as const;
}

/**
 * toolbox 传感器双端口阴影：复选下拉字段保存为 "0,1"。
 */
export function portShadowMulti(
  ports: [string | number, string | number] = ['0', '1'],
) {
  return {
    type: BLOCK_TYPES.common.portPairDropdown,
    fields: { PORT: ports.map(String).join(',') },
  } as const;
}

/**
 * toolbox 电机双端口阴影：复选下拉字段保存为 "4,5"。
 */
export function motorPortShadowMulti(
  ports: [string | number, string | number] = ['4', '5'],
) {
  return {
    type: BLOCK_TYPES.common.motorPortPairDropdown,
    fields: { PORT: ports.map(String).join(',') },
  } as const;
}

type NumericShadowType =
  | typeof BLOCK_TYPES.common.integerSlider
  | typeof BLOCK_TYPES.common.decimalSlider
  | typeof BLOCK_TYPES.common.positiveKeyboard
  | 'math_integer';

function numericShadow(type: NumericShadowType, num: number) {
  return {
    type,
    fields: { NUM: num },
  } as const;
}

/** toolbox `inputs.<name>.shadow`：整数滑块（范围/步长在 numberShadowReporters 定义） */
export function integerSliderShadow(num: number) {
  return numericShadow(BLOCK_TYPES.common.integerSlider, num);
}

/** toolbox `inputs.<name>.shadow`：小数滑块 */
export function decimalSliderShadow(num: number) {
  return numericShadow(BLOCK_TYPES.common.decimalSlider, num);
}

/** toolbox `inputs.<name>.shadow`：键盘输入任意数字（含负数、小数） */
export function numberKeyboardShadow(num: number) {
  return numericShadow(BLOCK_TYPES.common.positiveKeyboard, num);
}

/** toolbox `inputs.<name>.shadow`：键盘输入整数 */
export function integerKeyboardShadow(num: number) {
  return numericShadow('math_integer', num);
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

/**
 * toolbox `inputs.<name>.shadow`：音符选择（pitch 0–36）。
 * `pitch` 为初始音高编号，field_note_picker 会将其显示为音名（如 "C1"）。
 */
export function noteShadow(pitch: number = 12) {
  return {
    type: BLOCK_TYPES.common.notePicker,
    fields: { NOTE: String(pitch) },
  } as const;
}

/**
 * toolbox `inputs.<name>.shadow`：手柄按键选择。
 * `value` 为按键名字符串（up/down/left/right/L1/R1/y/a/b/x）。
 */
export function handleShankShadow(value: string = 'up') {
  return {
    type: BLOCK_TYPES.common.handleShankPicker,
    fields: { HANDLESHANK: normalizeHandleShankKey(value) },
  } as const;
}
