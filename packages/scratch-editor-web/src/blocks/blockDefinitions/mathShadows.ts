import { BLOCK_TYPES } from '../blockTypes';

/**
 * 数字阴影 reporter：通过 field 的 type 区分滑块 / 键盘编辑 UI。
 * toolbox 里选用对应 block type 即可，无需改主积木定义。
 */
export const mathShadowBlockDefinitions = [
  {
    type: BLOCK_TYPES.math.powerPercent,
    message0: '%1',
    args0: [
      {
        type: 'field_number_slider',
        name: 'NUM',
        value: 50,
        min: 0,
        max: 100,
        precision: 1,
      },
    ],
    output: 'Number',
    style: 'motion_blocks',
  },
  {
    type: BLOCK_TYPES.math.durationSeconds,
    message0: '%1',
    args0: [
      {
        type: 'field_number_slider',
        name: 'NUM',
        value: 2,
        min: 0,
        max: 999,
        precision: 0.1,
      },
    ],
    output: 'Number',
    style: 'motion_blocks',
  },
  {
    type: BLOCK_TYPES.math.positiveKeyboard,
    message0: '%1',
    args0: [
      {
        type: 'field_number_keyboard',
        name: 'NUM',
        value: 0,
        min: 0,
      },
    ],
    output: 'Number',
    style: 'math_blocks',
  },
] as const;
