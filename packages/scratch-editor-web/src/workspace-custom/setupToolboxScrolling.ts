import type { Toolbox } from 'blockly/core';

import type { Workspace } from '../codegen/types';

/**
 * Blockly 的工具箱默认会裁切内容；这里只负责让分类栏可以纵向滚动。
 * 图标替换等视觉补丁放在各自模块中，避免工具箱行为与图标渲染耦合。
 */
export function setupToolboxScrolling(workspace: Workspace): void {
  const toolbox = workspace.getToolbox?.() as Toolbox | null;
  if (!toolbox) {
    return;
  }

  const toolboxDiv = (toolbox as unknown as { HtmlDiv?: HTMLElement }).HtmlDiv;
  if (!toolboxDiv) {
    return;
  }

  Object.assign(toolboxDiv.style, {
    height: '100%',
    overflowX: 'hidden',
    overflowY: 'auto',
  });

  const toolboxContent = toolboxDiv.querySelector(
    '.blocklyToolboxContents',
  ) as HTMLElement | null;
  if (toolboxContent) {
    toolboxContent.style.minHeight = '100%';
  }

  const scrollbar = toolboxDiv.querySelector(
    '.blocklyToolboxScrollbar',
  ) as HTMLElement | null;
  if (scrollbar) {
    scrollbar.style.display = 'none';
  }
}
