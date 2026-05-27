import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';
import {
  serializeMatrixLightRows,
  DEFAULT_MATRIX_LIGHT_ROWS,
} from '@scratch-mobile/shared';
import {
  basicDropdownNumColShadow,
  basicDropdownNumRowShadow,
  stringShadow,
} from './shadowPresets';
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
      // fields.MATRIX：7×5 点阵序列化串（行 hex，逗号分隔）
      fields: {
        MATRIX: serializeMatrixLightRows(DEFAULT_MATRIX_LIGHT_ROWS),
      },
    },
    { kind: 'block', type: BLOCK_TYPES.matrixLight.clear },
    {
      kind: 'block',
      type: BLOCK_TYPES.matrixLight.setBrightness,
      // fields.BRIGHTNESS：全局亮度 0–7
      fields: {
        BRIGHTNESS: '0',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.matrixLight.showRoll,
      // inputs.TEXT.shadow.fields.TEXT：默认滚动文字
      inputs: {
        TEXT: { shadow: stringShadow('ABCD') },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.matrixLight.setPixelBrightness,
      // inputs：对应块定义里嵌套阴影槽名；shadow.fields.NUM = 列/行坐标初值
      inputs: {
        X: { shadow: basicDropdownNumColShadow(0) },
        Y: { shadow: basicDropdownNumRowShadow(0) },
      },
      // fields：父块自身字段；OPEN 下拉「打开」='0'、「关闭」='1'
      fields: {
        OPEN: '0',
      },
    },
  ],
} as const;
