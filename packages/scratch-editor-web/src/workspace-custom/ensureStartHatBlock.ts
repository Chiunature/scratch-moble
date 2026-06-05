/**
 * 主工作区「当程序启动时」帽形头积木：
 * - 初始化时若不存在则自动插入
 * - 工作区已有该积木时，飞栏内同名积木变灰且不可拖出（配合 inject maxInstances）
 * - 可将工作区内的块拖回飞栏删除，删除后飞栏恢复可拖
 */
import * as ScratchBlocks from 'scratch-blocks';

import { BLOCK_TYPES } from '../blocks/blockTypes';
import type { Workspace } from '../codegen/types';

const START_HAT_X = 48;
const START_HAT_Y = 48;

function countStartHatBlocks(workspace: Workspace): number {
  const getBlocksByType = (
    workspace as Workspace & {
      getBlocksByType?: (type: string, ordered: boolean) => unknown[];
    }
  ).getBlocksByType;

  if (getBlocksByType) {
    return getBlocksByType.call(
      workspace,
      BLOCK_TYPES.event.whenFlagClicked,
      false,
    ).length;
  }

  return workspace
    .getTopBlocks(true)
    .filter(block => block.type === BLOCK_TYPES.event.whenFlagClicked).length;
}

function createStartHatBlock(workspace: Workspace): void {
  const blockText = `
    <xml>
      <block type="${BLOCK_TYPES.event.whenFlagClicked}"
             x="${START_HAT_X}"
             y="${START_HAT_Y}">
      </block>
    </xml>`;
  const blockDom = ScratchBlocks.utils.xml.textToDom(blockText).firstElementChild;
  if (!blockDom) {
    throw new Error('Failed to create start hat block XML');
  }

  ScratchBlocks.Xml.domToBlock(blockDom, workspace);
}

/** 工作区尚无启动头时插入一个（不强制固定 ID，允许拖回飞栏删除）。 */
export function insertStartHatBlockIfMissing(workspace: Workspace): void {
  if (countStartHatBlocks(workspace) > 0) {
    return;
  }
  createStartHatBlock(workspace);
}

export function setupStartHatBlock(workspace: Workspace): void {
  insertStartHatBlockIfMissing(workspace);
}
