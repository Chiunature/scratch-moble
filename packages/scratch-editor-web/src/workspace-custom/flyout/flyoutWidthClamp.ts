/**
 * 飞出栏宽度控制
 * - 收起态：宽度限制在 maxWidthPx 内
 * - 展开态：根据内容实际宽度自动撑开
 */
import type { Workspace } from '../../codegen/types';

export function setupFlyoutWidthClamp(workspace: Workspace): void {
  const tryBind = (): boolean => {
    const root = workspace.getInjectionDiv?.();
    const flyoutSvg = root?.querySelector('svg.blocklyFlyout'); //找到飞出栏的SVG元素
    if (!(flyoutSvg instanceof SVGSVGElement)) return false; //如果飞出栏的SVG元素不存在，则返回false

    const flyout = workspace.getToolbox?.()?.getFlyout?.();
    if (!flyout) return false; //如果飞出栏实例不存在，则返回false

    // 强制刷新， Blockly 编辑器在界面发生变化后，重新计算所有 UI 组件的位置和大小，避免显示错位
    const refreshLayout = () => {
      flyout.reflow?.();
      workspace.resizeContents?.();
      flyout.position?.();
    };

    const collapse = () => {
      flyoutSvg.style.removeProperty('overflow');
      refreshLayout();
    };

    const expand = () => {
      flyoutSvg.style.overflow = 'visible';
      refreshLayout();
    };

    // 初始状态：收起
    collapse();

    // 绑定交互事件
    flyoutSvg.addEventListener('pointerenter', expand);
    flyoutSvg.addEventListener('pointerleave', collapse);
    flyoutSvg.addEventListener('pointercancel', collapse);
    flyoutSvg.addEventListener('pointerdown', expand, true);

    return true;
  };

  // 等待 DOM 就绪
  if (!tryBind()) {
    // 类似于定时器，跟帧率有关，每秒60帧，每帧16.67ms刷新一次，直到DOM就绪
    requestAnimationFrame(() => tryBind());
  }
}
