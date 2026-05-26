import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';
import {
  serializeMatrixLightRows,
  DEFAULT_MATRIX_LIGHT_ROWS,
} from '@scratch-mobile/shared';

export const matrixLightToolboxCategory = {
  kind: 'category',
  id: 'matrixLight',
  name: '矩阵灯',
  categorystyle: 'matrixLight_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('matrixLight'),
  },
  contents: [
    {
      kind: 'block',
      type: BLOCK_TYPES.matrixLight.show,
      fields: {
        MATRIX: serializeMatrixLightRows(DEFAULT_MATRIX_LIGHT_ROWS),
      },
    },
  ],
} as const;
