/**
 * Toolbox 分类元数据与公共工具。
 * 新增分类时：补 TOOLBOX_CATEGORIES、创建对应分类文件、再在 index.ts 汇总。
 */
export const TOOLBOX_CATEGORIES = [
  { id: 'motor', displayText: '电机', colour: '#4c97ff' },
  { id: 'move', displayText: '移动', colour: '#ff4ccd' },
  { id: 'matrixLight', displayText: '矩阵灯', colour: '#9966ff' },
  { id: 'sound', displayText: '声音', colour: '#cf63cf' },
  { id: 'event', displayText: '事件', colour: '#ffbf00' },
  { id: 'control', displayText: '控制', colour: '#ffab19' },
  { id: 'sensor', displayText: '传感器', colour: '#34ccf1' },
  { id: 'operation', displayText: '运算', colour: '#59c059' },
  { id: 'variable', displayText: '变量', colour: '#ff8c1a' },
  { id: 'customBlock', displayText: '自制积木', colour: '#ff6680' },
] as const;

/**
 * Blockly 会把返回值写进分类项的 class；后缀与分类 id 一致，
 * 便于 patchToolboxCategoryIcons 从 DOM 兜底识别。
 */
export function toolboxCategoryIconClasses(categoryId: string): string {
  return `toolbox-category-icon toolbox-category-icon-${categoryId}`;
}
