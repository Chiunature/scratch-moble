import * as ScratchBlocks from 'scratch-blocks';

import { toolboxCategoryIconClasses } from './shared';

/** 动态分类：飞出栏内容由 ScratchVariables.getVariablesCategory 生成 */
export const variableToolboxCategory = {
  kind: 'category',
  id: 'variable',
  name: '变量',
  custom: ScratchBlocks.VARIABLE_CATEGORY_NAME,
  categorystyle: 'variable_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('variable'),
  },
} as const;
