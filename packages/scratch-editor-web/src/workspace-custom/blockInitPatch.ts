/**
 * scratch-blocks 积木 init 包装：在原始 init 之后执行补丁逻辑。
 */
import * as ScratchBlocks from 'scratch-blocks';
import type * as Blockly from 'blockly/core';

export function wrapScratchBlockInit(
  blockType: string,
  patch: (block: Blockly.BlockSvg) => void,
): void {
  const blockDef = ScratchBlocks.Blocks[blockType];
  const originalInit = blockDef?.init;
  if (!originalInit) {
    return;
  }

  blockDef.init = function (this: Blockly.BlockSvg) {
    originalInit.call(this);
    patch(this);
  };
}
