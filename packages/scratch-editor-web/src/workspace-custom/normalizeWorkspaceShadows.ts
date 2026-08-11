import { BLOCK_TYPES } from '../blocks/blockTypes';

/** toolbox 默认 shadow reporter 类型；槽内仅字段、无用户拖入的独立逻辑块 */
export const DEFAULT_SHADOW_REPORTER_BLOCK_TYPES = [
  BLOCK_TYPES.common.portDropdown,
  BLOCK_TYPES.common.motorPortDropdown,
  BLOCK_TYPES.common.portPairDropdown,
  BLOCK_TYPES.common.motorPortPairDropdown,
  BLOCK_TYPES.common.integerSlider,
  BLOCK_TYPES.common.decimalSlider,
  BLOCK_TYPES.common.positiveKeyboard,
  BLOCK_TYPES.common.basicDropdownNumCol,
  BLOCK_TYPES.common.basicDropdownNumRow,
  BLOCK_TYPES.common.notePicker,
  BLOCK_TYPES.common.handleShankPicker,
  'math_integer',
  'text',
] as const;

export const DEFAULT_SHADOW_REPORTER_TYPE_SET = new Set<string>(
  DEFAULT_SHADOW_REPORTER_BLOCK_TYPES,
);

const PROCEDURE_PROTOTYPE_BLOCK_TYPE = 'procedures_prototype';
const ARGUMENT_REPORTER_BLOCK_TYPES = [
  'argument_reporter_string_number',
  'argument_reporter_boolean',
] as const;
const ARGUMENT_REPORTER_BLOCK_TYPE_SET = new Set<string>(
  ARGUMENT_REPORTER_BLOCK_TYPES,
);

export type SerializedInputState = {
  block?: SerializedBlockState;
  shadow?: SerializedBlockState;
};

export type SerializedBlockState = {
  type?: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, SerializedInputState>;
  next?: SerializedInputState;
};

function cloneFields(
  fields: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return fields ? { ...fields } : undefined;
}

/**
 * 将 input 内「本应作为 shadow 的 reporter」从 block 降回 shadow。
 * 与 procedureDrag 中 argument reporter 的处理一致，供持久化 save/load 复用。
 */
export function demoteMatchingBlocksToShadows(
  state: SerializedBlockState | undefined,
  typeSet: Set<string>,
): void {
  if (!state?.inputs) {
    return;
  }

  for (const input of Object.values(state.inputs)) {
    if (!input) {
      continue;
    }

    const block = input.block;
    if (block?.type && typeSet.has(block.type)) {
      input.shadow = {
        type: block.type,
        ...(cloneFields(block.fields)
          ? { fields: cloneFields(block.fields) }
          : {}),
      };
      delete input.block;
      continue;
    }

    if (block) {
      demoteMatchingBlocksToShadows(block, typeSet);
    }
    if (input.shadow) {
      demoteMatchingBlocksToShadows(input.shadow, typeSet);
    }
  }

  const nextBlock = state.next?.block;
  if (nextBlock) {
    demoteMatchingBlocksToShadows(nextBlock, typeSet);
  }
}

function walkSerializedBlockTree(
  value: unknown,
  visitor: (block: SerializedBlockState) => void,
): void {
  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      walkSerializedBlockTree(item, visitor);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.type === 'string') {
    visitor(record as SerializedBlockState);
  }

  for (const nested of Object.values(record)) {
    walkSerializedBlockTree(nested, visitor);
  }
}

function migrateLegacyPortPairReporter(block: SerializedBlockState): void {
  if (block.type !== BLOCK_TYPES.common.portDropdown) {
    return;
  }
  const port = block.fields?.PORT;
  if (typeof port === 'string' && port.includes(',')) {
    block.type = BLOCK_TYPES.common.portPairDropdown;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isArgumentReporterBlock(
  block: SerializedBlockState | undefined,
): boolean {
  return Boolean(block?.type && ARGUMENT_REPORTER_BLOCK_TYPE_SET.has(block.type));
}

function removeDerivedProcedurePrototypeInputs(
  block: SerializedBlockState,
): void {
  if (block.type !== PROCEDURE_PROTOTYPE_BLOCK_TYPE || !block.inputs) {
    return;
  }

  for (const [inputName, input] of Object.entries(block.inputs)) {
    if (isArgumentReporterBlock(input.block)) {
      delete input.block;
    }
    if (isArgumentReporterBlock(input.shadow)) {
      delete input.shadow;
    }
    if (!input.block && !input.shadow) {
      delete block.inputs[inputName];
    }
  }

  if (Object.keys(block.inputs).length === 0) {
    delete block.inputs;
  }
}

function removeTopLevelOrphanArgumentReporters(state: unknown): void {
  if (!isRecord(state) || !isRecord(state.blocks)) {
    return;
  }

  const rootBlocks = state.blocks.blocks;
  if (!Array.isArray(rootBlocks)) {
    return;
  }

  state.blocks.blocks = rootBlocks.filter(
    block => !isArgumentReporterBlock(block as SerializedBlockState),
  );
}

/**
 * 规范化 Blockly workspace 序列化 JSON：
 * - 默认 shadow reporter 降回 shadow，避免加载后出现白底 reporter；
 * - 自制积木 prototype 的参数 reporter 由 mutation 派生，不落盘，避免重载后重复生成。
 */
export function normalizeDefaultShadowReportersInWorkspaceState(
  state: unknown,
): unknown {
  if (state == null) {
    return state;
  }

  walkSerializedBlockTree(state, block => {
    migrateLegacyPortPairReporter(block);
    removeDerivedProcedurePrototypeInputs(block);
    demoteMatchingBlocksToShadows(block, DEFAULT_SHADOW_REPORTER_TYPE_SET);
  });
  removeTopLevelOrphanArgumentReporters(state);

  return state;
}
