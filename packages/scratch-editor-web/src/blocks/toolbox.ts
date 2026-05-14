/**
 * 工具栏（Toolbox）聚合入口。
 * 各分类的具体积木项拆在 toolboxCategories/<分类>.ts，避免后续积木增多后堆在单文件里。
 */
import { inject } from 'scratch-blocks';

import {
  toolboxCategoryContents,
  TOOLBOX_CATEGORIES,
} from './toolboxCategories';

export { TOOLBOX_CATEGORIES };

/** 与 `inject` 的 JSON toolbox 形态一致（不直接引用 blockly 子路径，以便在仅依赖 scratch-blocks 时解析类型）。 */
type InjectableToolboxJson = Extract<
  NonNullable<Parameters<typeof inject>[1]['toolbox']>,
  { contents: unknown[] }
>;

/** Blockly 将 `contents` 标为可变数组；分类 JSON 使用 `as const` 推断为 readonly，注入前断言（运行时未修改该对象）。 */
export const toolboxJson = {
  kind: 'categoryToolbox',
  contents: toolboxCategoryContents,
} as unknown as InjectableToolboxJson;
