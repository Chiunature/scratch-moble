import {
  buildAssistantCandidate,
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
});
