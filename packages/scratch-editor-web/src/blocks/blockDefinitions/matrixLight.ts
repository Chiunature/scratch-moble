import { BLOCK_TYPES } from '../blockTypes';
import matrixIcon from '../../../assets/block/block_matrix.svg';
import separatorVertical from '../../../assets/block/block_separator_vertical.svg';
import {
  serializeMatrixLightRows,
  DEFAULT_MATRIX_LIGHT_ROWS,
} from '@scratch-mobile/shared';

export const matrixLightBlockDefinitions = [
  {
    type: BLOCK_TYPES.matrixLight.show,
    message0: '%1 %2 显示矩阵灯 %3',
    args0: [
      {
        type: 'field_image',
        src: matrixIcon,
        width: 24,
        height: 24,
        alt: '*',
      },
      {
        type: 'field_image',
        src: separatorVertical,
        width: 2,
        height: 30,
        alt: '',
      },
      {
        type: 'field_matrix_light',
        name: 'MATRIX',
        value: serializeMatrixLightRows(DEFAULT_MATRIX_LIGHT_ROWS),
      },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    style: 'looks_blocks',
  },
] as const;
