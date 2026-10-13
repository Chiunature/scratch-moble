import { z } from 'zod/v4';
export * from './evaluation';

export const CURRENT_ASSISTANT_PROPOSAL_SCHEMA_VERSION = 1 as const;
export type AssistantProposalSchemaVersion = 1;
export const ASSISTANT_CAPABILITY_CATALOG_VERSION = '1';
const port = z.number().int().min(4).max(7);
const power = z.number().min(-100).max(100);
const seconds = z.number().min(0).max(60);
const note = z.number().int().min(0).max(36);
const direction = z.enum(['advance', 'retreat', 'left', 'right']);
const mode = z.enum(['coast', 'brake']);

export const AssistantStatementSchema = z.union([
  z.strictObject({ kind: z.literal('motor.runPower'), port, power }),
  z.strictObject({
    kind: z.literal('motor.runForPowerSeconds'),
    port,
    power,
    seconds,
  }),
  z.strictObject({ kind: z.literal('motor.stop'), port }),
  z.strictObject({ kind: z.literal('motor.stopModule'), port, mode }),
  z.strictObject({ kind: z.literal('move.directionPower'), direction, power }),
  z.strictObject({
    kind: z.literal('move.directionPowerSeconds'),
    direction,
    power,
    seconds,
  }),
  z.strictObject({
    kind: z.literal('move.differentialPower'),
    leftPower: power,
    rightPower: power,
  }),
  z.strictObject({
    kind: z.literal('move.differentialPowerSeconds'),
    leftPower: power,
    rightPower: power,
    seconds,
  }),
  z.strictObject({ kind: z.literal('move.stop') }),
  z.strictObject({ kind: z.literal('control.sleep'), seconds }),
  z.strictObject({
    kind: z.literal('sound.playMusic'),
    note,
    duration: seconds,
  }),
]);
export type AssistantStatement = z.infer<typeof AssistantStatementSchema>;
const patchShape = {
  port,
  power,
  seconds,
  note,
  direction,
  mode,
  leftPower: power,
  rightPower: power,
  duration: seconds,
};
const patchSchema = z.strictObject(patchShape).partial();
export type AssistantStatementPatch = z.infer<typeof patchSchema>;
const blockId = z.string().trim().min(1).max(128);
const statements = z.array(AssistantStatementSchema).min(1).max(32);
export const AssistantOperationSchema = z.union([
  z.strictObject({ kind: z.literal('replaceMainScript'), statements }),
  z.strictObject({ kind: z.literal('appendToMainScript'), statements }),
  z.strictObject({
    kind: z.literal('updateStatement'),
    blockId,
    patch: patchSchema,
  }),
  z.strictObject({ kind: z.literal('removeStatement'), blockId }),
]);
export type AssistantEditOperation = z.infer<typeof AssistantOperationSchema>;
const proposalSchema = z.strictObject({
  schemaVersion: z.literal(1),
  intent: z.enum(['create', 'modify', 'explain']),
  summary: z.string().trim().min(1).max(500),
  explanation: z.string().trim().min(1).max(4000).nullish(),
  clarificationQuestion: z.string().trim().min(1).max(500).nullish(),
  operations: z.array(AssistantOperationSchema).max(32),
});
export type AssistantIntent = 'create' | 'modify' | 'explain';
export type AssistantProposal = Omit<
  z.infer<typeof proposalSchema>,
  'explanation' | 'clarificationQuestion'
> & {
  explanation?: string;
  clarificationQuestion?: string;
};
export type AssistantValidationIssue = { path: string; message: string };
export class AssistantContractError extends Error {
  constructor(readonly issues: readonly AssistantValidationIssue[]) {
    super(issues.map(issue => `${issue.path}: ${issue.message}`).join('; '));
    this.name = 'AssistantContractError';
  }
}

export function parseAssistantProposal(value: unknown): AssistantProposal {
  // Strict structured-output services encode absent patch fields as null.
  const normalized =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? ({ ...value } as Record<string, unknown>)
      : value;
  if (
    normalized &&
    typeof normalized === 'object' &&
    'operations' in normalized &&
    Array.isArray(normalized.operations)
  ) {
    normalized.operations = normalized.operations.map(op => {
      if (
        op?.kind !== 'updateStatement' ||
        !op.patch ||
        typeof op.patch !== 'object' ||
        Array.isArray(op.patch)
      )
        return op;
      return {
        ...op,
        patch: Object.fromEntries(
          Object.entries(op.patch).filter(
            ([key, v]) =>
              v !== null ||
              !Object.prototype.hasOwnProperty.call(patchShape, key),
          ),
        ),
      };
    });
  }
  const result = proposalSchema.safeParse(normalized);
  if (!result.success) {
    // Never echo untrusted values (which could contain secrets) into errors.
    throw new AssistantContractError([
      { path: '$', message: '提案结构、字段或参数范围无效' },
    ]);
  }
  const p = result.data;
  let invalid = false;
  if (p.intent === 'explain' || p.clarificationQuestion)
    invalid = p.operations.length !== 0;
  else if (p.intent === 'create')
    invalid =
      p.operations.length !== 1 || p.operations[0].kind !== 'replaceMainScript';
  else
    invalid =
      p.operations.length === 0 ||
      p.operations.some(op => op.kind === 'replaceMainScript');
  if (
    p.operations.some(
      op => op.kind === 'updateStatement' && Object.keys(op.patch).length === 0,
    )
  )
    invalid = true;
  if (invalid)
    throw new AssistantContractError([
      { path: '$.operations', message: '操作与意图不一致或修改为空' },
    ]);
  return {
    ...p,
    explanation: p.explanation ?? undefined,
    clarificationQuestion: p.clarificationQuestion ?? undefined,
  };
}

// OpenAI strict output requires every object property to be required; optional
// fields become nullable on the wire. Runtime parsing still accepts omissions.
const wirePatch = z.strictObject({
  port: port.nullable(),
  power: power.nullable(),
  seconds: seconds.nullable(),
  note: note.nullable(),
  direction: direction.nullable(),
  mode: mode.nullable(),
  leftPower: power.nullable(),
  rightPower: power.nullable(),
  duration: seconds.nullable(),
});
const wireSchema = proposalSchema.extend({
  explanation: z.string().trim().min(1).max(4000).nullable(),
  clarificationQuestion: z.string().trim().min(1).max(500).nullable(),
  operations: z
    .array(
      z.union([
        z.strictObject({ kind: z.literal('replaceMainScript'), statements }),
        z.strictObject({ kind: z.literal('appendToMainScript'), statements }),
        z.strictObject({
          kind: z.literal('updateStatement'),
          blockId,
          patch: wirePatch,
        }),
        z.strictObject({ kind: z.literal('removeStatement'), blockId }),
      ]),
    )
    .max(32),
});
export const ASSISTANT_PROPOSAL_JSON_SCHEMA = z.toJSONSchema(wireSchema, {
  target: 'draft-7',
});

export type AssistantBlockSummary = {
  id: string;
  type: string;
  role: 'hat' | 'statement' | 'reporter' | 'unknown';
  fields: Record<string, string | number | boolean>;
  inputNames: string[];
  nextId?: string;
  statement?: AssistantStatement;
};
export type AssistantWorkspaceContext = {
  projectId: string;
  workspaceHash: string;
  generatedCode: string;
  blocks: AssistantBlockSummary[];
};
export type AssistantCapability = {
  kind: AssistantStatement['kind'];
  blockType: string;
  description: string;
  valueConstraints: Record<string, string>;
};
export const ASSISTANT_CAPABILITIES: readonly AssistantCapability[] = [
  {
    kind: 'motor.runPower',
    blockType: 'run_power',
    description: '电机持续运行',
    valueConstraints: { port: '整数4..7，对应E..H', power: '-100..100' },
  },
  {
    kind: 'motor.runForPowerSeconds',
    blockType: 'run_for_power_seconds',
    description: '电机定时运行',
    valueConstraints: {
      port: '整数4..7，对应E..H',
      power: '-100..100',
      seconds: '0..60',
    },
  },
  {
    kind: 'motor.stop',
    blockType: 'stop',
    description: '停止电机',
    valueConstraints: { port: '整数4..7，对应E..H' },
  },
  {
    kind: 'motor.stopModule',
    blockType: 'stop_module',
    description: '电机滑行或刹车停止',
    valueConstraints: { port: '整数4..7，对应E..H', mode: 'coast或brake' },
  },
  {
    kind: 'move.directionPower',
    blockType: 'mov_dir_power',
    description: '底盘持续运动',
    valueConstraints: {
      direction: 'advance/retreat/left/right',
      power: '-100..100',
    },
  },
  {
    kind: 'move.directionPowerSeconds',
    blockType: 'mov_dir_power_seconds',
    description: '底盘定时运动',
    valueConstraints: {
      direction: 'advance/retreat/left/right',
      power: '-100..100',
      seconds: '0..60',
    },
  },
  {
    kind: 'move.differentialPower',
    blockType: 'mov_power',
    description: '左右轮持续运动',
    valueConstraints: { leftPower: '-100..100', rightPower: '-100..100' },
  },
  {
    kind: 'move.differentialPowerSeconds',
    blockType: 'mov_for_power_seconds',
    description: '左右轮定时运动',
    valueConstraints: {
      leftPower: '-100..100',
      rightPower: '-100..100',
      seconds: '0..60',
    },
  },
  {
    kind: 'move.stop',
    blockType: 'mov_stop',
    description: '停止底盘',
    valueConstraints: {},
  },
  {
    kind: 'control.sleep',
    blockType: 'sleep_s',
    description: '等待',
    valueConstraints: { seconds: '0..60' },
  },
  {
    kind: 'sound.playMusic',
    blockType: 'play_music',
    description: '播放音符',
    valueConstraints: {
      note: '整数0..36，0为C1，每半音加1',
      duration: '0..60',
    },
  },
];
