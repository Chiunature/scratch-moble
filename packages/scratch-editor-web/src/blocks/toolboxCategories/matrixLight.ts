import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';

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
      inputs: {
        TIMES: {
          shadow: {
            type: 'math_number',
            fields: { NUM: 10 },
          },
        },
      },
    },
  ],
} as const;
