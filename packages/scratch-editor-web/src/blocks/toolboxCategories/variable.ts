import * as ScratchBlocks from 'scratch-blocks';

import { buildToolboxCategory } from './buildCategory';

/** 动态分类：飞出栏内容由 ScratchVariables.getVariablesCategory 生成 */
export function variableToolboxCategory() {
  return buildToolboxCategory({
    id: 'variable',
    categorystyle: 'variable_category',
    custom: ScratchBlocks.VARIABLE_CATEGORY_NAME,
  });
}
