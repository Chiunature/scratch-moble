import * as ScratchBlocks from 'scratch-blocks';

import { toolboxCategoryIconClasses } from './shared';

/** 动态分类：飞出栏内容由 ScratchProcedures.getProceduresCategory 生成 */
export const customBlockToolboxCategory = {
  kind: 'category',
  id: 'customBlock',
  name: '自制积木',
  custom: ScratchBlocks.PROCEDURE_CATEGORY_NAME,
  categorystyle: 'customBlock_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('customBlock'),
  },
} as const;
