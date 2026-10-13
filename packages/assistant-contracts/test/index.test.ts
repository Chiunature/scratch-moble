import {
  ASSISTANT_CAPABILITIES,
  ASSISTANT_EVALUATION_CASES,
  ASSISTANT_PROPOSAL_JSON_SCHEMA,
  AssistantContractError,
  parseAssistantProposal,
} from '../src';

type JsonSchema = {
  type?: string | string[];
  additionalProperties?: boolean;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
};

function expectContractError(value: unknown): AssistantContractError {
  try {
    parseAssistantProposal(value);
    throw new Error('expected parse to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(AssistantContractError);
    return error as AssistantContractError;
  }
}

describe('assistant proposal contract', () => {
  const createProposal = (
    statements: unknown[],
    extra: Record<string, unknown> = {},
  ) => ({
    schemaVersion: 1,
    intent: 'create',
    summary: '创建程序',
    explanation: null,
    clarificationQuestion: null,
    operations: [{ kind: 'replaceMainScript', statements }],
    ...extra,
  });

  it('parses all 11 supported statement kinds', () => {
    const proposal = parseAssistantProposal(
      createProposal([
        { kind: 'motor.runPower', port: 4, power: 50 },
        { kind: 'motor.runForPowerSeconds', port: 5, power: -20, seconds: 2 },
        { kind: 'motor.stop', port: 6 },
        { kind: 'motor.stopModule', port: 7, mode: 'brake' },
        { kind: 'move.directionPower', direction: 'advance', power: 40 },
        {
          kind: 'move.directionPowerSeconds',
          direction: 'retreat',
          power: 30,
          seconds: 1.5,
        },
        { kind: 'move.differentialPower', leftPower: 50, rightPower: 30 },
        {
          kind: 'move.differentialPowerSeconds',
          leftPower: 40,
          rightPower: -40,
          seconds: 3,
        },
        { kind: 'move.stop' },
        { kind: 'control.sleep', seconds: 1 },
        { kind: 'sound.playMusic', note: 36, duration: 0.25 },
      ]),
    );

    expect(proposal.operations[0]).toMatchObject({ kind: 'replaceMainScript' });
    expect(ASSISTANT_CAPABILITIES).toHaveLength(11);
    expect(ASSISTANT_EVALUATION_CASES).toHaveLength(30);
  });

  it('enforces integer ports and notes and numeric bounds', () => {
    const invalidStatements = [
      { kind: 'motor.stop', port: 4.5 },
      { kind: 'motor.stop', port: 3 },
      { kind: 'sound.playMusic', note: 1.5, duration: 1 },
      { kind: 'sound.playMusic', note: 37, duration: 1 },
    ];

    for (const statement of invalidStatements) {
      const error = expectContractError(createProposal([statement]));
      expect(error.issues).toEqual([
        { path: '$', message: '提案结构、字段或参数范围无效' },
      ]);
    }
  });

  it('rejects unsupported statements, operations, and malicious fields', () => {
    expectContractError(
      createProposal([{ kind: 'javascript.execute', code: 'alert(1)' }]),
    );
    expectContractError(
      createProposal([{ kind: 'motor.stop', port: 4, execute: 'rm -rf /' }]),
    );
    expectContractError(
      createProposal([{ kind: 'move.stop' }], { injected: true }),
    );
    expectContractError(
      // eslint-disable-next-line no-script-url -- Malicious input must be rejected, not executed.
      createProposal([{ kind: 'move.stop' }], { code: 'javascript:alert(1)' }),
    );
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'rejects null prototype-named patch fields: %s',
    key => {
      const patch = JSON.parse(`{"power":20,"${key}":null}`);
      expectContractError({
        schemaVersion: 1,
        intent: 'modify',
        summary: '未知字段不能当作可空参数移除',
        operations: [{ kind: 'updateStatement', blockId: 'block-1', patch }],
      });
    },
  );

  it('keeps patch flat, whitelisted, validated, and non-empty', () => {
    const proposal = parseAssistantProposal({
      schemaVersion: 1,
      intent: 'modify',
      summary: '修改功率',
      explanation: null,
      clarificationQuestion: null,
      operations: [
        {
          kind: 'updateStatement',
          blockId: 'block-1',
          patch: {
            port: null,
            power: 80,
            seconds: null,
            mode: null,
            direction: null,
            leftPower: null,
            rightPower: null,
            note: null,
            duration: null,
          },
        },
      ],
    });

    expect(proposal.operations).toEqual([
      {
        kind: 'updateStatement',
        blockId: 'block-1',
        patch: { power: 80 },
      },
    ]);
    expectContractError({
      schemaVersion: 1,
      intent: 'modify',
      summary: '空 patch',
      operations: [{ kind: 'updateStatement', blockId: 'block-1', patch: {} }],
    });
    expectContractError({
      schemaVersion: 1,
      intent: 'modify',
      summary: '未知 patch',
      operations: [
        {
          kind: 'updateStatement',
          blockId: 'block-1',
          patch: { power: 20, script: 'bad' },
        },
      ],
    });
    expectContractError({
      schemaVersion: 1,
      intent: 'modify',
      summary: '嵌套 patch',
      operations: [
        {
          kind: 'updateStatement',
          blockId: 'block-1',
          patch: { values: { power: 20 } },
        },
      ],
    });
  });

  it('requires create to use exactly one replace operation and protects existing scripts', () => {
    expectContractError(
      createProposal([{ kind: 'move.stop' }], {
        operations: [
          { kind: 'appendToMainScript', statements: [{ kind: 'move.stop' }] },
        ],
      }),
    );
    expectContractError({
      schemaVersion: 1,
      intent: 'create',
      summary: '多个替换',
      operations: [
        { kind: 'replaceMainScript', statements: [] },
        { kind: 'replaceMainScript', statements: [] },
      ],
    });
    expectContractError({
      schemaVersion: 1,
      intent: 'modify',
      summary: '保护已有程序',
      operations: [{ kind: 'replaceMainScript', statements: [] }],
    });
  });

  it('forbids operations for explain and clarification responses', () => {
    expectContractError({
      schemaVersion: 1,
      intent: 'explain',
      summary: '解释程序',
      explanation: '当前程序会停止小车。',
      clarificationQuestion: null,
      operations: [{ kind: 'move.stop' }],
    });
    expect(
      parseAssistantProposal({
        schemaVersion: 1,
        intent: 'create',
        summary: '需要参数',
        explanation: null,
        clarificationQuestion: '请问需要多大功率？',
        operations: [],
      }).operations,
    ).toEqual([]);
    expectContractError({
      schemaVersion: 1,
      intent: 'create',
      summary: '缺参数却猜测',
      clarificationQuestion: '请问需要多大功率？',
      operations: [
        {
          kind: 'replaceMainScript',
          statements: [
            { kind: 'move.directionPower', direction: 'advance', power: 50 },
          ],
        },
      ],
    });
  });

  it('accepts omitted optional fields and normalizes nullable structured fields', () => {
    const omitted = parseAssistantProposal({
      schemaVersion: 1,
      intent: 'create',
      summary: '停止',
      operations: [
        { kind: 'replaceMainScript', statements: [{ kind: 'move.stop' }] },
      ],
    });
    expect(omitted.explanation).toBeUndefined();
    expect(omitted.clarificationQuestion).toBeUndefined();

    const nullable = parseAssistantProposal({
      schemaVersion: 1,
      intent: 'modify',
      summary: '改功率',
      explanation: null,
      clarificationQuestion: null,
      operations: [
        {
          kind: 'updateStatement',
          blockId: 'b1',
          patch: {
            port: null,
            power: 40,
            seconds: null,
            mode: null,
            direction: null,
            leftPower: null,
            rightPower: null,
            note: null,
            duration: null,
          },
        },
      ],
    });
    expect(nullable.explanation).toBeUndefined();
    expect(nullable.clarificationQuestion).toBeUndefined();
  });

  it('rejects malformed proposals without echoing raw values in error messages', () => {
    const error = expectContractError({
      schemaVersion: 99,
      intent: 'create',
      summary: '',
      operations: 'replace',
      secret: 'do-not-echo-this-secret',
    });
    expect(error.issues.map(issue => issue.path)).toEqual(['$']);
    expect(error.message).not.toContain('do-not-echo-this-secret');
    expect(error.message).not.toContain('99');
  });

  it('exports a fully closed strict OpenAI JSON schema', () => {
    expect(ASSISTANT_PROPOSAL_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(ASSISTANT_PROPOSAL_JSON_SCHEMA.properties.operations.maxItems).toBe(
      32,
    );
    expect(ASSISTANT_PROPOSAL_JSON_SCHEMA.required).toEqual([
      'schemaVersion',
      'intent',
      'summary',
      'explanation',
      'clarificationQuestion',
      'operations',
    ]);
    expect(
      ASSISTANT_PROPOSAL_JSON_SCHEMA.properties.explanation.anyOf.map(
        (s: JsonSchema) => s.type,
      ),
    ).toEqual(['string', 'null']);
    expect(
      ASSISTANT_PROPOSAL_JSON_SCHEMA.properties.clarificationQuestion.anyOf.map(
        (s: JsonSchema) => s.type,
      ),
    ).toEqual(['string', 'null']);

    const visit = (schema: JsonSchema) => {
      if (
        schema.type === 'object' ||
        (Array.isArray(schema.type) && schema.type.includes('object'))
      ) {
        expect(schema.additionalProperties).toBe(false);
        expect(schema.required).toBeDefined();
        expect(schema.required?.slice().sort()).toEqual(
          Object.keys(schema.properties ?? {}).sort(),
        );
        Object.values(schema.properties ?? {}).forEach(visit);
      }
      if (schema.items) visit(schema.items);
      schema.anyOf?.forEach(visit);
    };
    visit(ASSISTANT_PROPOSAL_JSON_SCHEMA);
  });
});
