import * as ScratchBlocks from 'scratch-blocks';

import type {
  ProcedureDeclarationBlock,
  ProcedureEditorWorkspace,
} from './procedureWorkspace';

export function loadProcedureMutation(
  workspace: ProcedureEditorWorkspace,
  mutation: Element,
): ProcedureDeclarationBlock {
  const blockText = `
    <xml>
      <block type="procedures_declaration" deletable="false" movable="false">
        ${ScratchBlocks.Xml.domToText(mutation)}
      </block>
    </xml>`;
  const blockDom = ScratchBlocks.utils.xml.textToDom(blockText).firstElementChild;
  if (!blockDom) {
    throw new Error('Failed to create procedure declaration XML');
  }

  const block = ScratchBlocks.Xml.domToBlock(
    blockDom,
    workspace,
  ) as ProcedureDeclarationBlock;
  block.initSvg?.();
  block.render?.();
  block.moveTo?.(new ScratchBlocks.utils.Coordinate(28, 34));
  return block;
}
