/**
 * 工具栏（Toolbox）聚合入口。
 * 各分类的具体积木项拆在 toolboxCategories/<分类>.ts，避免后续积木增多后堆在单文件里。
 */
import {
  toolboxCategoryContents,
  TOOLBOX_CATEGORIES,
} from './toolboxCategories';

export { TOOLBOX_CATEGORIES };

export const toolboxJson = {
  kind: 'categoryToolbox',
  contents: toolboxCategoryContents,
} as const;
