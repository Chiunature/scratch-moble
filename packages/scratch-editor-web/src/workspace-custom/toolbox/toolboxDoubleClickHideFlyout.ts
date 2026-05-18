/**
 * 当某个分类已经是「当前选中」时，再次点击同一分类则关闭飞出栏并取消高亮。
 * （第一次点该栏：选中并显示飞出栏；第二次点同一栏：隐藏。）
 *
 * 使用 pointerdown 捕获阶段拦截，避免依赖 dblclick，在移动端 WebView 上更一致。
 *
 * scratch-blocks 使用 ContinuousFlyout（autoClose 为 false），需显式 flyout.hide()。
 */
import type { Toolbox } from 'blockly/core';

import type { Workspace } from '../../codegen/types';

import { getToolboxItemContainingDomNode } from './toolboxDom';

export function setupToolboxDoubleClickHideFlyout(workspace: Workspace): void {
  const toolbox = workspace.getToolbox?.() as Toolbox | null;
  const host = toolbox?.HtmlDiv ?? null;
  if (!toolbox || !host) {
    return;
  }
  const flyout = toolbox.getFlyout?.();
  if (!flyout?.hide) {
    return;
  }
  host.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) {
        return;
      }
      const hit = getToolboxItemContainingDomNode(toolbox, e.target);
      if (!hit?.isSelectable?.()) {
        return;
      }
      const selected = toolbox.getSelectedItem?.();
      if (!selected || selected.getId() !== hit.getId()) {
        return;
      }
      if (!flyout.isVisible?.()) {
        return;
      }
      flyout.hide();
      toolbox.clearSelection?.();
      workspace.resize?.();
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );
}
