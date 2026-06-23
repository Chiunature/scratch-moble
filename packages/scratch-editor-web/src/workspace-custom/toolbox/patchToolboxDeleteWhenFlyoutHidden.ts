/**
 * 飞栏隐藏时，ContinuousToolbox.getClientRect() 会返回 null，导致无法拖入删除。
 * 回退到工具箱分类栏（窄条）即可——原飞栏占位已归工作区，不应再算作删除区。
 */
import * as ScratchBlocks from 'scratch-blocks';

import type { Workspace } from '../../codegen/types';

const PATCH_KEY = '__scratchEditorWebToolboxDeletePatched';

type ToolboxLike = {
  getClientRect: () => ScratchBlocks.utils.Rect | null;
  getFlyout: () => FlyoutLike | null;
};

type FlyoutLike = {
  isVisible: () => boolean;
  autoClose?: boolean;
};

export function patchToolboxDeleteWhenFlyoutHidden(workspace: Workspace): void {
  const toolbox = workspace.getToolbox?.() as ToolboxLike | null | undefined;
  if (!toolbox?.getClientRect) {
    return;
  }
  if ((toolbox as unknown as Record<string, boolean>)[PATCH_KEY]) {
    return;
  }
  (toolbox as unknown as Record<string, boolean>)[PATCH_KEY] = true;

  const origGetClientRect = toolbox.getClientRect.bind(toolbox);
  const stripGetClientRect =
    ScratchBlocks.Toolbox.prototype.getClientRect.bind(toolbox);

  toolbox.getClientRect = function () {
    const flyout = this.getFlyout?.();
    if (flyout && !flyout.autoClose && flyout.isVisible?.()) {
      return origGetClientRect();
    }
    return stripGetClientRect();
  };
}
