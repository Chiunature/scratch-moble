/**
 * 带 colours_from_parent 的阴影块（port_dropdown、basic_dropdown_num 等）：
 * 插入父积木后同步父块配色。
 *
 * 须用 setStyle(父块 styleName)，勿用 setColour(getColour())，否则阴影会变成
 * auto_#9966ff，打开 field_dropdown 时会拼成 auto_#9966ff_selected 并触发 Invalid colour。
 * RN 端口弹窗使用自有主题（portPickerOptions），不从 Web 取色。
 */
import * as ScratchBlocks from 'scratch-blocks';
import { Events, renderManagement } from 'scratch-blocks';

import { BLOCK_TYPES } from './blockTypes';
import type { Workspace } from '../codegen/types';

const PORT_DROPDOWN_TYPE = BLOCK_TYPES.common.portDropdown;

/** 使用 colours_from_parent 扩展的 reporter / shadow 块 */
export const COLOURS_FROM_PARENT_BLOCK_TYPES = new Set<string>([
  BLOCK_TYPES.common.portDropdown,
  BLOCK_TYPES.common.integerSlider,
  BLOCK_TYPES.common.decimalSlider,
  BLOCK_TYPES.common.positiveKeyboard,
  BLOCK_TYPES.common.basicDropdownNumCol,
  BLOCK_TYPES.common.basicDropdownNumRow,
  BLOCK_TYPES.common.notePicker,
  BLOCK_TYPES.common.handleShankPicker,
]);

type ColouredBlock = ScratchBlocks.Block & {
  setOnChange(handler: (event: Events.Abstract) => void): void;
  queueRender?: () => void;
};

function getHostParent(block: ColouredBlock): ColouredBlock | null {
  const parent = block.getParent() as ColouredBlock | null;
  if (!parent) {
    return null;
  }
  if (parent.type === PORT_DROPDOWN_TYPE) {
    return null;
  }
  return parent;
}

export function syncColourFromParent(block: ColouredBlock): void {
  const parent = getHostParent(block);
  if (parent) {
    const styleName = parent.getStyleName();
    if (styleName) {
      block.setStyle(styleName);
    } else {
      block.setColour(parent.getColour());
    }
    return;
  }
  block.setStyle('textField');
}

/** workspace.load 在 Events.disable 下不会触发 BLOCK_MOVE，须在加载后手动刷新配色。 */
export function refreshColoursFromParentInWorkspace(workspace: Workspace): void {
  for (const block of workspace.getAllBlocks(false)) {
    if (!COLOURS_FROM_PARENT_BLOCK_TYPES.has(block.type)) {
      continue;
    }
    syncColourFromParent(block as ColouredBlock);
    (block as ColouredBlock).queueRender?.();
  }
  renderManagement.triggerQueuedRenders();
}

let extensionsRegistered = false;

export function registerPortDropdownExtensions(): void {
  if (extensionsRegistered) {
    return;
  }
  extensionsRegistered = true;

  ScratchBlocks.Extensions.register(
    'colours_from_parent',
    function coloursFromParent() {
      const block = this as ColouredBlock;

      const apply = () => syncColourFromParent(block);

      apply();

      block.setOnChange((event: Events.Abstract) => {
        if (!event) {
          apply();
          return;
        }
        if (
          event.type === Events.BLOCK_MOVE ||
          event.type === Events.BLOCK_CREATE
        ) {
          apply();
        }
      });
    },
  );
}
