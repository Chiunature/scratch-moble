import {
  AssistantStatementSchema,
  type AssistantStatement,
} from '@scratch-mobile/assistant-contracts';

import { BLOCK_TYPES } from '../blocks/blockTypes';

type SerializedBlock = {
  id: string;
  type: string;
  fields?: Record<string, string | number>;
  inputs?: Record<string, { shadow: SerializedBlock }>;
  next?: { block: SerializedBlock };
};

export type AssistantWorkspaceSnapshot = {
  blocks: {
    languageVersion: 0;
    blocks: SerializedBlock[];
  };
};

function numberShadow(value: number, id: string): SerializedBlock {
  return {
    id,
    type: Number.isInteger(value)
      ? BLOCK_TYPES.common.integerSlider
      : BLOCK_TYPES.common.positiveKeyboard,
    fields: { NUM: value },
  };
}

function portShadow(port: number, id: string): SerializedBlock {
  return {
    id,
    type: BLOCK_TYPES.common.motorPortDropdown,
    fields: { PORT: String(port) },
  };
}

function noteShadow(note: number, id: string): SerializedBlock {
  return {
    id,
    type: BLOCK_TYPES.common.notePicker,
    fields: { NOTE: String(note) },
  };
}

export function statementToBlock(
  statement: AssistantStatement,
  id: string,
): SerializedBlock {
  switch (statement.kind) {
    case 'motor.runPower':
      return {
        id,
        type: BLOCK_TYPES.motor.runPower,
        inputs: {
          PORTS: { shadow: portShadow(statement.port, `${id}-port`) },
          POWER: { shadow: numberShadow(statement.power, `${id}-power`) },
        },
      };
    case 'motor.runForPowerSeconds':
      return {
        id,
        type: BLOCK_TYPES.motor.runForPowerSeconds,
        inputs: {
          PORTS: { shadow: portShadow(statement.port, `${id}-port`) },
          POWER: { shadow: numberShadow(statement.power, `${id}-power`) },
          SECONDS: { shadow: numberShadow(statement.seconds, `${id}-seconds`) },
        },
      };
    case 'motor.stop':
      return {
        id,
        type: BLOCK_TYPES.motor.stop,
        inputs: {
          PORTS: { shadow: portShadow(statement.port, `${id}-port`) },
        },
      };
    case 'motor.stopModule':
      return {
        id,
        type: BLOCK_TYPES.motor.stopModule,
        fields: { MODE: statement.mode === 'brake' ? '1' : '0' },
        inputs: {
          PORTS: { shadow: portShadow(statement.port, `${id}-port`) },
        },
      };
    case 'move.directionPower':
      return {
        id,
        type: BLOCK_TYPES.move.movDirPower,
        fields: { DIRECTION: statement.direction },
        inputs: {
          POWER: { shadow: numberShadow(statement.power, `${id}-power`) },
        },
      };
    case 'move.directionPowerSeconds':
      return {
        id,
        type: BLOCK_TYPES.move.movDirPowerSeconds,
        fields: { DIRECTION: statement.direction },
        inputs: {
          POWER: { shadow: numberShadow(statement.power, `${id}-power`) },
          SECONDS: { shadow: numberShadow(statement.seconds, `${id}-seconds`) },
        },
      };
    case 'move.differentialPower':
      return {
        id,
        type: BLOCK_TYPES.move.movPower,
        inputs: {
          LEFT_POWER: {
            shadow: numberShadow(statement.leftPower, `${id}-left`),
          },
          RIGHT_POWER: {
            shadow: numberShadow(statement.rightPower, `${id}-right`),
          },
        },
      };
    case 'move.differentialPowerSeconds':
      return {
        id,
        type: BLOCK_TYPES.move.movForPowerSeconds,
        inputs: {
          LEFT_POWER: {
            shadow: numberShadow(statement.leftPower, `${id}-left`),
          },
          RIGHT_POWER: {
            shadow: numberShadow(statement.rightPower, `${id}-right`),
          },
          SECONDS: { shadow: numberShadow(statement.seconds, `${id}-seconds`) },
        },
      };
    case 'move.stop':
      return { id, type: BLOCK_TYPES.move.movStop };
    case 'control.sleep':
      return {
        id,
        type: BLOCK_TYPES.control.sleepS,
        inputs: {
          SECONDS: { shadow: numberShadow(statement.seconds, `${id}-seconds`) },
        },
      };
    case 'sound.playMusic':
      return {
        id,
        type: BLOCK_TYPES.sound.playMusic,
        inputs: {
          NOTE: { shadow: noteShadow(statement.note, `${id}-note`) },
          DURATION: {
            shadow: numberShadow(statement.duration, `${id}-duration`),
          },
        },
      };
  }
}

/**
 * Build a deterministic Scratch Blocks serialization for a new main script.
 * The returned snapshot is a candidate only; callers must not persist it until
 * the user confirms the proposal and the editor verifies its current hash.
 */
export function buildAssistantWorkspaceSnapshot(
  statements: readonly AssistantStatement[],
): AssistantWorkspaceSnapshot {
  const statementBlocks = statements.map((statement, index) =>
    statementToBlock(
      AssistantStatementSchema.parse(statement),
      `assistant-statement-${index + 1}`,
    ),
  );

  for (let index = 0; index < statementBlocks.length - 1; index += 1) {
    statementBlocks[index]!.next = { block: statementBlocks[index + 1]! };
  }

  const hat: SerializedBlock = {
    id: 'assistant-event-when-flag-clicked',
    type: BLOCK_TYPES.event.whenFlagClicked,
  };
  if (statementBlocks[0]) {
    hat.next = { block: statementBlocks[0] };
  }

  return {
    blocks: {
      languageVersion: 0,
      blocks: [hat],
    },
  };
}
