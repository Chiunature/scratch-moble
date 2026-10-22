import {
  buildAssistantCandidate,
  buildPythonCandidate,
  readStatement,
} from '../src/assistant/candidate';

describe('buildAssistantCandidate', () => {
  it('preserves unknown roots and unknown metadata while appending to the main chain', () => {
    const base = {
      variables: [{ id: 'variable-1', name: 'kept' }],
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            id: 'unknown',
            type: 'future_block',
            x: 12,
            mutation: { opaque: 'keep' },
          },
          { id: 'hat', type: 'event_when_flag_clicked' },
        ],
      },
    };

    const candidate = buildAssistantCandidate(
      base,
      {
        schemaVersion: 1,
        intent: 'modify',
        summary: 'append',
        operations: [
          { kind: 'appendToMainScript', statements: [{ kind: 'move.stop' }] },
        ],
      },
      'candidate',
    );

    expect(candidate.variables).toEqual(base.variables);
    expect(candidate.blocks?.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'unknown',
          type: 'future_block',
          x: 12,
          mutation: { opaque: 'keep' },
        }),
      ]),
    );
    expect(
      candidate.blocks?.blocks?.find(block => block.id === 'hat')?.next?.block
        ?.type,
    ).toBe('mov_stop');
    expect(base.blocks.blocks).toHaveLength(2);
  });

  it('changes only requested statement parameters and keeps the target block identity', () => {
    const base = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            id: 'hat',
            type: 'event_when_flag_clicked',
            next: {
              block: {
                id: 'drive',
                type: 'mov_dir_power',
                fields: { DIRECTION: 'advance', unrelated: 'keep' },
                inputs: {
                  POWER: {
                    shadow: {
                      id: 'drive-power',
                      type: 'math_integer',
                      fields: { NUM: 25 },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    };

    const candidate = buildAssistantCandidate(
      base,
      {
        schemaVersion: 1,
        intent: 'modify',
        summary: 'change power',
        operations: [
          { kind: 'updateStatement', blockId: 'drive', patch: { power: 80 } },
        ],
      },
      'candidate',
    );
    const block = candidate.blocks?.blocks?.[0]?.next?.block;
    expect(block).toBeDefined();
    if (!block) throw new Error('candidate block missing');

    expect(block.id).toBe('drive');
    expect(block.fields).toEqual({ DIRECTION: 'advance', unrelated: 'keep' });
    expect(block.inputs?.POWER?.shadow?.fields).toEqual({ NUM: 80 });
    expect(readStatement(block)).toEqual({
      kind: 'move.directionPower',
      direction: 'advance',
      power: 80,
    });
    expect(
      base.blocks.blocks?.[0]?.next?.block?.inputs?.POWER?.shadow?.fields,
    ).toEqual({ NUM: 25 });
  });

  it('rejects updates targeting unknown blocks instead of rewriting their structure', () => {
    expect(() =>
      buildAssistantCandidate(
        {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                id: 'hat',
                type: 'event_when_flag_clicked',
                next: {
                  block: {
                    id: 'unknown',
                    type: 'future_statement',
                    fields: { opaque: 'keep' },
                  },
                },
              },
            ],
          },
        },
        {
          schemaVersion: 1,
          intent: 'modify',
          summary: 'change',
          operations: [
            {
              kind: 'updateStatement',
              blockId: 'unknown',
              patch: { power: 20 },
            },
          ],
        },
        'candidate',
      ),
    ).toThrow('当前积木结构不支持此修改');
  });

  it('clears the whole workspace only with workspace scope', () => {
    const base = {
      variables: [{ id: 'variable-1', name: '速度' }],
      blocks: {
        languageVersion: 0,
        blocks: [{ id: 'hat', type: 'event_when_flag_clicked' }],
      },
    };
    const mainOnly = buildPythonCandidate(base, '# 清空\n', 'ai', 'main');
    expect(mainOnly.blocks.blocks).toHaveLength(1);
    expect(mainOnly.variables).toEqual([{ id: 'variable-1', name: '速度' }]);

    const cleared = buildPythonCandidate(base, '# 清空\n', 'ai', 'workspace');
    expect(cleared.blocks.blocks).toEqual([]);
    expect(cleared.variables).toEqual([]);
  });

  it('replaces custom blocks only with procedures scope', () => {
    const candidate = buildPythonCandidate(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            { id: 'hat', type: 'event_when_flag_clicked' },
            { id: 'old-def', type: 'procedures_definition' },
          ],
        },
      },
      [
        '# @custom qianjin => 前进 %n',
        '# @custom-arg qianjin bushu => 步数',
        'def qianjin(bushu):',
        "    _motor.mov_dir_power('advance', bushu)",
        'qianjin(40)',
      ].join('\n'),
      'ai',
      'procedures',
    );
    const roots = candidate.blocks.blocks ?? [];
    const hat = roots.find(block => block.type === 'event_when_flag_clicked');
    expect(hat?.next?.block?.type).toBe('procedures_call');
    expect(roots.filter(block => block.type === 'procedures_definition')).toHaveLength(1);
    expect(roots.some(block => block.id === 'old-def')).toBe(false);
  });

  it('keeps old custom definitions under main scope', () => {
    const candidate = buildPythonCandidate(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            { id: 'hat', type: 'event_when_flag_clicked' },
            { id: 'old-def', type: 'procedures_definition' },
          ],
        },
      },
      '_motor.mov_stop()',
      'ai',
      'main',
    );
    const roots = candidate.blocks.blocks ?? [];
    expect(roots.some(block => block.id === 'old-def')).toBe(true);
    expect(
      roots.find(block => block.type === 'event_when_flag_clicked')?.next?.block
        ?.type,
    ).toBe('mov_stop');
  });
});
