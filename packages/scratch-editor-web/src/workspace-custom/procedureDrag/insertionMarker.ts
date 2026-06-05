import * as ScratchBlocks from 'scratch-blocks';
import type * as Blockly from 'blockly/core';

import { ARGUMENT_REPORTER_TYPE_SET } from './constants';
import { logProcedureDrag } from './debug';

type SerializedInput = {
  block?: SerializedBlockState;
  shadow?: SerializedBlockState;
};

type SerializedBlockState = {
  type?: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, SerializedInput>;
};

function demoteReporterBlocksToShadows(
  state: SerializedBlockState | undefined,
): void {
  if (!state?.inputs) {
    return;
  }
  for (const input of Object.values(state.inputs)) {
    if (!input) {
      continue;
    }
    const block = input.block;
    if (block?.type && ARGUMENT_REPORTER_TYPE_SET.has(block.type)) {
      input.shadow = {
        type: block.type,
        ...(block.fields ? { fields: { ...block.fields } } : {}),
      };
      delete input.block;
      continue;
    }
    if (block) {
      demoteReporterBlocksToShadows(block);
    }
    if (input.shadow) {
      demoteReporterBlocksToShadows(input.shadow);
    }
  }
}

function isDefinitionStackBlock(block: Blockly.BlockSvg): boolean {
  if (block.type === 'procedures_definition') {
    return true;
  }
  return block.getRootBlock().type === 'procedures_definition';
}

class ProcedureDefinitionInsertionMarkerPreviewer extends ScratchBlocks.InsertionMarkerPreviewer {
  protected override serializeBlockToInsertionMarker(
    block: Blockly.BlockSvg,
  ): ReturnType<
    ScratchBlocks.InsertionMarkerPreviewer['serializeBlockToInsertionMarker']
  > {
    const state = ScratchBlocks.serialization.blocks.save(block, {
      addCoordinates: false,
      addInputBlocks: true,
      addNextBlocks: false,
      doFullSerialization: false,
    });

    if (!state) {
      throw new Error(`Failed to serialize source block. ${block.toDevString()}`);
    }

    if (isDefinitionStackBlock(block)) {
      demoteReporterBlocksToShadows(state as SerializedBlockState);
      logProcedureDrag('definition', 'insertion-marker:shadow-reporters', {
        rootType: block.type,
        rootId: block.id,
      });
    }

    return state;
  }
}

export function registerProcedureDefinitionInsertionMarkerPreviewer(): void {
  ScratchBlocks.registry.register(
    ScratchBlocks.registry.Type.CONNECTION_PREVIEWER,
    ScratchBlocks.registry.DEFAULT,
    ProcedureDefinitionInsertionMarkerPreviewer,
    true,
  );
}
