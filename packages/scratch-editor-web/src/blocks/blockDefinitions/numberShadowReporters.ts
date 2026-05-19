import { BLOCK_TYPES } from '../blockTypes';

/**
 * 通用数字阴影 reporter（滑块 / 键盘），仅作槽内 shadow，不进飞出栏。
 * `precision` 即步长；RN 滑块见 numberSliderEditor。toolbox 仅可覆盖 `fields.NUM`。
 */
const SLIDER_DEFAULTS = { value: 0, min: 0, max: 999 } as const;

function sliderShadowReporter(
  type: typeof BLOCK_TYPES.common.integerSlider | typeof BLOCK_TYPES.common.decimalSlider,
  precision: number,
) {
  return {
    type,
    message0: '%1',
    args0: [
      {
        type: 'field_number_slider',
        name: 'NUM',
        ...SLIDER_DEFAULTS,
        precision,
      },
    ],
    output: 'Number',
    style: 'motion_blocks',
  };
}

export const numberShadowReporterDefinitions = [
  sliderShadowReporter(BLOCK_TYPES.common.integerSlider, 1),
  sliderShadowReporter(BLOCK_TYPES.common.decimalSlider, 0.1),
  {
    type: BLOCK_TYPES.common.positiveKeyboard,
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
