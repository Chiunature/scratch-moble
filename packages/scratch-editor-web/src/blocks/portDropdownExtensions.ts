/**
 * port_dropdown 阴影块：插入父积木后同步父块颜色。
 * RN 端口弹窗使用自有主题（portPickerOptions），不从 Web 取色。
 */
import * as ScratchBlocks from 'scratch-blocks';
import { Events } from 'scratch-blocks';

import { BLOCK_TYPES } from './blockTypes';

const PORT_DROPDOWN_TYPE = BLOCK_TYPES.common.portDropdown;

type ColouredBlock = ScratchBlocks.Block & {
  setOnChange(handler: (event: Events.Abstract) => void): void;
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

function syncColourFromParent(block: ColouredBlock): void {
  const parent = getHostParent(block);
  if (parent) {
    block.setColour(parent.getColour());
    return;
  }
  // 飞出栏内单独展示时用中性文本域色
  block.setStyle('text_blocks');
}

let extensionsRegistered = false;

export function registerPortDropdownExtensions(): void {
  if (extensionsRegistered) {
    return;
  }
  extensionsRegistered = true;

  ScratchBlocks.Extensions.register('colours_from_parent', function coloursFromParent() {
    const block = this as ColouredBlock;

    const apply = () => syncColourFromParent(block);

    apply();

    block.setOnChange((event: Events.Abstract) => {
      if (!event) {
        apply();
        return;
      }
      if (event.type === Events.BLOCK_MOVE || event.type === Events.BLOCK_CREATE) {
        apply();
      }
    });
  });
}
