import type { Workspace } from '../codegen/types';

/**
 * 工具箱分类点击钩子（预留）。
 *
 * 选中态高亮不要在外层 `getDiv()`（`.blocklyToolboxCategoryContainer`）上加背景：
 * Blockly 把 `blocklyToolboxSelected` 加在内层 `.blocklyToolboxCategory`（row）上，
 * 视觉上盖住外层。请在 `scripts/build.mjs` 里覆盖
 * `.blocklyToolboxCategory.blocklyToolboxSelected { ... }`。
 */
export const setupToolboxCategoryClick = (_workspace: Workspace): void => {};
