/**
 * Toolbox 分类元数据与公共工具。
 * 新增已实现分类时：补 IMPLEMENTED_TOOLBOX_CATEGORIES、创建对应分类文件、再在 index.ts 汇总。
 * 规划中分类见 PLANNED_TOOLBOX_CATEGORIES（仅主题/图标，尚未加入 toolboxJson）。
 */

/** 已挂载到 toolboxJson 的分类 */
export const IMPLEMENTED_TOOLBOX_CATEGORIES = [
  { id: 'motor', displayText: '电机', colour: '#4c97ff' },
  { id: 'move', displayText: '移动', colour: '#ff4ccd' },
  { id: 'matrixLight', displayText: '矩阵灯', colour: '#9966ff' },
  { id: 'sound', displayText: '声音', colour: '#cf63cf' },
  { id: 'event', displayText: '事件', colour: '#ffbf00' },
  { id: 'control', displayText: '控制', colour: '#ffab19' },
  { id: 'sensor', displayText: '传感器', colour: '#34ccf1' },
] as const;

/** 规划中：已有主题色与图标映射，尚未加入 toolboxCategoryContents */
export const PLANNED_TOOLBOX_CATEGORIES = [
  {
    id: 'operation',
    displayText: '运算',
    colour: '#59c059',
    planned: true as const,
  },
  {
    id: 'variable',
    displayText: '变量',
    colour: '#ff8c1a',
    planned: true as const,
  },
  {
    id: 'customBlock',
    displayText: '自制积木',
    colour: '#ff6680',
    planned: true as const,
  },
] as const;

/** 全部分类（含规划），供主题与图标补丁使用 */
export const TOOLBOX_CATEGORIES = [
  ...IMPLEMENTED_TOOLBOX_CATEGORIES,
  ...PLANNED_TOOLBOX_CATEGORIES,
] as const;

/**
 * Blockly 会把返回值写进分类项的 class；后缀与分类 id 一致，
 * 便于 patchToolboxCategoryIcons 从 DOM 兜底识别。
 */
export function toolboxCategoryIconClasses(categoryId: string): string {
  return `toolbox-category-icon toolbox-category-icon-${categoryId}`;
}
