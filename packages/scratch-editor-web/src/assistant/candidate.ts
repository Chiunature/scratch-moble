import {
  ASSISTANT_CAPABILITIES,
  AssistantStatementSchema,
  parseAssistantProposal,
  type AssistantBlockSummary,
  type AssistantStatement,
} from '@scratch-mobile/assistant-contracts';
import { statementToBlock } from './buildWorkspaceSnapshot';
import { BLOCK_TYPES } from '../blocks/blockTypes';
import {
  pythonToWorkspace,
  isEmptyAssistantPython,
  type EmittedBlock,
} from '../decompile';

export type BlockState = {
  id?: string;
  type: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: BlockState; shadow?: BlockState }>;
  next?: { block?: BlockState };
  [key: string]: unknown;
};
export type WorkspaceState = {
  blocks?: { blocks?: BlockState[]; [key: string]: unknown };
  [key: string]: unknown;
};
const numericTypes = new Set([
  'math_number',
  'math_integer',
  'math_whole_number',
  'math_positive_number',
  'number_slider_integer',
  'number_slider_decimal',
  'math_positive_number_keyboard',
]);
const inputFields: Record<string, [string, string]> = {
  port: ['PORTS', 'PORT'],
  power: ['POWER', 'NUM'],
  seconds: ['SECONDS', 'NUM'],
  leftPower: ['LEFT_POWER', 'NUM'],
  rightPower: ['RIGHT_POWER', 'NUM'],
  note: ['NOTE', 'NOTE'],
  duration: ['DURATION', 'NUM'],
};
const keys: Record<AssistantStatement['kind'], string[]> = {
  'motor.runPower': ['port', 'power'],
  'motor.runForPowerSeconds': ['port', 'power', 'seconds'],
  'motor.stop': ['port'],
  'motor.stopModule': ['port', 'mode'],
  'move.directionPower': ['direction', 'power'],
  'move.directionPowerSeconds': ['direction', 'power', 'seconds'],
  'move.differentialPower': ['leftPower', 'rightPower'],
  'move.differentialPowerSeconds': ['leftPower', 'rightPower', 'seconds'],
  'move.stop': [],
  'control.sleep': ['seconds'],
  'sound.playMusic': ['note', 'duration'],
};
function fail(): never {
  throw new Error('当前积木结构不支持此修改，请保留原程序并缩小修改范围。');
}

export function readStatement(
  block: BlockState,
): AssistantStatement | undefined {
  const capability = ASSISTANT_CAPABILITIES.find(
    c => c.blockType === block.type,
  );
  if (!capability) return undefined;
  const result: Record<string, unknown> = { kind: capability.kind };
  for (const key of keys[capability.kind]) {
    if (key === 'direction') result[key] = block.fields?.DIRECTION;
    else if (key === 'mode')
      result[key] =
        String(block.fields?.MODE) === '1'
          ? 'brake'
          : String(block.fields?.MODE) === '0'
          ? 'coast'
          : undefined;
    else {
      const [inputName, fieldName] = inputFields[key];
      const input = block.inputs?.[inputName];
      const literal = input?.block ?? input?.shadow;
      if (!literal || literal.inputs || literal.next) return undefined;
      const expectedType =
        key === 'port'
          ? 'motor_port_dropdown'
          : key === 'note'
          ? 'note_picker'
          : undefined;
      if (
        expectedType
          ? literal.type !== expectedType
          : !numericTypes.has(literal.type)
      )
        return undefined;
      const value = literal.fields?.[fieldName];
      if (
        typeof value !== 'number' &&
        (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value))
      )
        return undefined;
      result[key] = Number(value);
    }
  }
  const parsed = AssistantStatementSchema.safeParse(result);
  return parsed.success ? parsed.data : undefined;
}

/** Bounded JSON clone also rejects duplicate IDs, cycles and prototype keys. */
export function cloneWorkspace(value: unknown): WorkspaceState {
  let nodes = 0;
  const ids = new Set<string>();
  const ancestors = new Set<object>();
  function visit(v: unknown, depth: number): unknown {
    if (++nodes > 15000 || depth > 200) fail();
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v !== 'object' || !v || ancestors.has(v)) fail();
    ancestors.add(v);
    let out: unknown;
    if (Array.isArray(v)) out = v.map(x => visit(x, depth + 1));
    else {
      const record = v as Record<string, unknown>;
      if (typeof record.type === 'string' && typeof record.id === 'string') {
        if (ids.has(record.id)) fail();
        ids.add(record.id);
      }
      out = Object.fromEntries(
        Object.entries(record).map(([k, x]) => {
          if (['__proto__', 'prototype', 'constructor'].includes(k)) fail();
          return [k, visit(x, depth + 1)];
        }),
      );
    }
    ancestors.delete(v);
    return out;
  }
  const cloned = visit(value ?? {}, 0);
  if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) fail();
  const state = cloned as WorkspaceState;
  if (
    state.blocks &&
    (!Array.isArray(state.blocks.blocks) ||
      state.blocks.blocks.some(b => !b || typeof b.type !== 'string'))
  )
    fail();
  return state;
}
export function stableWorkspaceJson(value: unknown): string {
  function stable(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => [k, stable(x)]),
      );
    return v;
  }
  return JSON.stringify(stable(value));
}
export function workspaceFingerprint(value: unknown): string {
  const text = stableWorkspaceJson(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    // eslint-disable-next-line no-bitwise -- FNV-1a requires a 32-bit XOR.
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  // Fingerprints are for transport; application additionally compares full JSON.
  // eslint-disable-next-line no-bitwise -- Serialize the unsigned 32-bit hash.
  return `${text.length}-${(hash >>> 0).toString(16)}`;
}
export function summarizeWorkspace(
  state: WorkspaceState,
): AssistantBlockSummary[] {
  const result: AssistantBlockSummary[] = [];
  function walk(b: BlockState) {
    if (result.length >= 500) fail();
    const fields = Object.fromEntries(
      Object.entries(b.fields ?? {}).filter(([, v]) =>
        ['string', 'number', 'boolean'].includes(typeof v),
      ),
    ) as AssistantBlockSummary['fields'];
    const statement = readStatement(b);
    result.push({
      id: b.id ?? '',
      type: b.type,
      fields,
      inputNames: Object.keys(b.inputs ?? {}),
      role:
        b.type === BLOCK_TYPES.event.whenFlagClicked
          ? 'hat'
          : statement
          ? 'statement'
          : 'unknown',
      ...(b.next?.block?.id ? { nextId: b.next.block.id } : {}),
      ...(statement ? { statement } : {}),
    });
    for (const input of Object.values(b.inputs ?? {})) {
      if (input.block) walk(input.block);
      else if (input.shadow) walk(input.shadow);
    }
    if (b.next?.block) walk(b.next.block);
  }
  for (const block of state.blocks?.blocks ?? []) walk(block);
  return result;
}

/** Only edits a clone. Unknown blocks, other scripts, variables and metadata survive. */
export function buildAssistantCandidate(
  base: unknown,
  rawProposal: unknown,
  prefix: string,
): WorkspaceState {
  const proposal = parseAssistantProposal(rawProposal);
  if (!proposal.operations.length) throw new Error('此提案没有可应用的修改。');
  const state = cloneWorkspace(base);
  state.blocks ??= { languageVersion: 0, blocks: [] };
  const roots = state.blocks.blocks!;
  const hats = roots.filter(b => b.type === BLOCK_TYPES.event.whenFlagClicked);
  if (hats.length > 1) fail();
  const hat: BlockState = hats[0] ?? {
    id: `${prefix}-hat`,
    type: BLOCK_TYPES.event.whenFlagClicked,
    x: 48,
    y: 48,
  };
  if (!hats.length) roots.push(hat);
  let sequence = 0;
  const used = new Set(summarizeWorkspace(state).map(b => b.id));
  const nextId = () => {
    let id: string;
    do {
      id = `${prefix}-${++sequence}`;
    } while (used.has(id) || [...used].some(x => x.startsWith(`${id}-`)));
    used.add(id);
    return id;
  };
  for (const op of proposal.operations) {
    if (op.kind === 'replaceMainScript' || op.kind === 'appendToMainScript') {
      // "Create" only fills an empty main script; it never erases existing work.
      if (op.kind === 'replaceMainScript' && hat.next?.block)
        throw new Error('主程序已有内容，请使用修改或追加，不能整体替换。');
      let tail = hat;
      while (tail.next?.block) tail = tail.next.block;
      for (const statement of op.statements) {
        const block = statementToBlock(statement, nextId());
        tail.next = { block };
        tail = block;
      }
    } else {
      let parent = hat;
      while (parent.next?.block && parent.next.block.id !== op.blockId)
        parent = parent.next.block;
      const block = parent.next?.block;
      if (!block) throw new Error('目标积木不在主程序的直接指令链中。');
      const statement = readStatement(block);
      if (!statement) fail();
      if (op.kind === 'removeStatement') {
        if (block.next) parent.next = block.next;
        else delete parent.next;
      } else {
        const changed = AssistantStatementSchema.safeParse({
          ...statement,
          ...op.patch,
        });
        if (!changed.success) fail();
        const replacement = statementToBlock(changed.data, block.id!);
        for (const key of Object.keys(op.patch)) {
          if (key === 'mode' || key === 'direction')
            block.fields = { ...block.fields, ...replacement.fields };
          else {
            const [name, field] = inputFields[key];
            const original =
              block.inputs![name].block ?? block.inputs![name].shadow!;
            const updated = replacement.inputs![name].shadow;
            original.fields = {
              ...original.fields,
              [field]: updated.fields![field],
            };
          }
        }
      }
    }
  }
  return cloneWorkspace(state);
}

/** Replaces the green-flag chain with blocks decompiled from restricted Python. */
export function buildPythonCandidate(
  base: unknown,
  python: string,
  prefix: string,
): WorkspaceState {
  if (isEmptyAssistantPython(python)) {
    const state = cloneWorkspace(base);
    state.blocks = { languageVersion: 0, blocks: [] };
    state.variables = [];
    return cloneWorkspace(state);
  }
  const fragment = pythonToWorkspace(python, prefix);
  if (!fragment.chain) throw new Error('没有可应用的积木。');
  const state = cloneWorkspace(base);
  state.blocks ??= { languageVersion: 0, blocks: [] };
  const roots = state.blocks.blocks!;
  const hats = roots.filter(block => block.type === BLOCK_TYPES.event.whenFlagClicked);
  if (hats.length > 1) fail();
  const hat: BlockState = hats[0] ?? {
    id: `${prefix}-hat`,
    type: BLOCK_TYPES.event.whenFlagClicked,
    x: 48,
    y: 48,
  };
  if (!hats.length) roots.push(hat);
  hat.next = { block: fragment.chain as EmittedBlock as BlockState };
  const existing = Array.isArray(state.variables) ? state.variables : [];
  const seen = new Set(
    existing.map(variable =>
      variable && typeof variable === 'object' && 'name' in variable
        ? String((variable as { name?: unknown }).name)
        : '',
    ),
  );
  state.variables = [
    ...existing,
    ...fragment.variables.filter(variable => !seen.has(variable.name)),
  ];
  return cloneWorkspace(state);
}
