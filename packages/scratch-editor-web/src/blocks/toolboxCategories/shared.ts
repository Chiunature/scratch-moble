/**
 * Toolbox 分类元数据与公共工具。
 * 文案来自 packages/i18n editor.json 的 toolbox.* 键。
 */

import { tEditor } from '@scratch-mobile/i18n';

export const TOOLBOX_CATEGORY_DEFS = [
  { id: 'motor', colour: '#4c97ff' },
  { id: 'move', colour: '#ff4ccd' },
  { id: 'matrixLight', colour: '#9966ff' },
  { id: 'sound', colour: '#cf63cf' },
  { id: 'event', colour: '#ffbf00' },
  { id: 'control', colour: '#ffab19' },
  { id: 'sensor', colour: '#34ccf1' },
  { id: 'operation', colour: '#59c059' },
  { id: 'variable', colour: '#ff8c1a' },
  { id: 'customBlock', colour: '#ff6680' },
] as const;

export type ToolboxCategoryId = (typeof TOOLBOX_CATEGORY_DEFS)[number]['id'];

export function getToolboxCategories(): Array<{
  id: ToolboxCategoryId;
  colour: string;
  displayText: string;
}> {
  return TOOLBOX_CATEGORY_DEFS.map(category => ({
    id: category.id,
    colour: category.colour,
    displayText: tEditor(`toolbox.${category.id}`),
  }));
}

/**
 * Blockly 会把返回值写进分类项的 class；后缀与分类 id 一致，
 * 便于 patchToolboxCategoryIcons 从 DOM 兜底识别。
 */
export function toolboxCategoryIconClasses(categoryId: string): string {
  return `toolbox-category-icon toolbox-category-icon-${categoryId}`;
}
