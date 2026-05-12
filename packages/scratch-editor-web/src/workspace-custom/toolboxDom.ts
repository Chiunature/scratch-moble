import type { IToolboxItem, Toolbox } from 'blockly/core';

/**
 * 点击事件 target 落在哪个工具箱分类项的容器内（含子节点）。
 * 供「双击关飞出栏」等逻辑复用，避免各处复制 for 循环。
 */
export function getToolboxItemContainingDomNode(
  toolbox: Toolbox,
  target: EventTarget | null,
): IToolboxItem | null {
  if (!(target instanceof Node)) {
    return null;
  }
  for (const item of toolbox.getToolboxItems()) {
    const div = item.getDiv();
    if (div && (div === target || div.contains(target))) {
      return item;
    }
  }
  return null;
}
