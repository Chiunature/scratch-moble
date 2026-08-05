import { BLOCK_TYPES } from '../blocks/blockTypes';

/** toolbox 默认 shadow reporter 类型；槽内仅字段、无用户拖入的独立逻辑块 */
export const DEFAULT_SHADOW_REPORTER_BLOCK_TYPES = [
  BLOCK_TYPES.common.portDropdown,
  BLOCK_TYPES.common.portPairDropdown,
  BLOCK_TYPES.common.integerSlider,
  BLOCK_TYPES.common.decimalSlider,
  BLOCK_TYPES.common.positiveKeyboard,
  BLOCK_TYPES.common.basicDropdownNumCol,
  BLOCK_TYPES.common.basicDropdownNumRow,
  BLOCK_TYPES.common.notePicker,
  BLOCK_TYPES.common.handleShankPicker,
  'text',
] as const;

export const DEFAULT_SHADOW_REPORTER_TYPE_SET = new Set<string>(
  DEFAULT_SHADOW_REPORTER_BLOCK_TYPES,
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

/** 规范化 Blockly workspace 序列化 JSON，避免默认 shadow 以 block 存盘/加载后出现白底 reporter。 */
export function normalizeDefaultShadowReportersInWorkspaceState(
  state: unknown,
): unknown {
  if (state == null) {
    return state;
  }

  walkSerializedBlockTree(state, block => {
    migrateLegacyPortPairReporter(block);
    demoteMatchingBlocksToShadows(block, DEFAULT_SHADOW_REPORTER_TYPE_SET);
  });

  return state;
}
