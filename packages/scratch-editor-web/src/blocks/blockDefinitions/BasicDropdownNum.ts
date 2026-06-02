import {
  MATRIX_LIGHT_COL_COUNT,
  MATRIX_LIGHT_ROW_COUNT,
} from '@scratch-mobile/shared';

import { BLOCK_TYPES } from '../blockTypes';

/** 生成 [ ['0','0'], ['1','1'], ... ] 共 count 项（0 ~ count-1） */
export const BASIC_DROPDOWN_NUM_OPTIONS = (count: number) =>
  Array.from({ length: count }, (_, i) => [String(i), String(i)]);

function basicDropdownNumDefinition(
  type:
    | typeof BLOCK_TYPES.common.basicDropdownNumCol
    | typeof BLOCK_TYPES.common.basicDropdownNumRow,
  optionCount: number,
) {
  return {
    type,
    message0: '%1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'NUM',
        options: BASIC_DROPDOWN_NUM_OPTIONS(optionCount),
      },
    ],
    extensions: ['output_number', 'colours_from_parent'],
  };
}

/** 仅作槽内阴影，不进飞出栏；列/行坐标范围见 @scratch-mobile/shared */
export const basicDropdownNumBlockDefinitions = [
  basicDropdownNumDefinition(
    BLOCK_TYPES.common.basicDropdownNumCol,
    MATRIX_LIGHT_COL_COUNT,
  ),
  basicDropdownNumDefinition(
    BLOCK_TYPES.common.basicDropdownNumRow,
    MATRIX_LIGHT_ROW_COUNT,
  ),
] as const;
