/**
 * scratch-blocks 的飞出栏 hide 后 isVisible 为 false，但 getWidth 仍恒为 250，布局错位。
 * 隐藏时让 getWidth 为 0；可见时仍用原实现（250）。
 */
import type { Workspace } from '../../codegen/types';

const PATCH_KEY = '__scratchEditorWebFlyoutGetWidthPatched';

type FlyoutLike = {
  getWidth: () => number;
  isVisible: () => boolean;
};

export function patchFlyoutGetWidthWhenHidden(workspace: Workspace): void {
  const flyout = workspace.getToolbox?.()?.getFlyout?.() as
    | FlyoutLike
    | null
    | undefined;
  if (!flyout?.getWidth || typeof flyout.isVisible !== 'function') return;
  if ((flyout as unknown as Record<string, boolean>)[PATCH_KEY]) return;
  (flyout as unknown as Record<string, boolean>)[PATCH_KEY] = true;

  const orig = flyout.getWidth.bind(flyout);
  flyout.getWidth = () => (flyout.isVisible() ? orig() : 0);
}
