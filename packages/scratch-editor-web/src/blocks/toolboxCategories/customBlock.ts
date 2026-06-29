import * as ScratchBlocks from 'scratch-blocks';

import { buildToolboxCategory } from './buildCategory';

/** 动态分类：飞出栏内容由 ScratchProcedures.getProceduresCategory 生成 */
export function customBlockToolboxCategory() {
  return buildToolboxCategory({
    id: 'customBlock',
    categorystyle: 'customBlock_category',
    custom: ScratchBlocks.PROCEDURE_CATEGORY_NAME,
  });
}
