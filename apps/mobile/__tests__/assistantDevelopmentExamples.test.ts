import {
  ASSISTANT_CAPABILITIES,
  parseAssistantProposal,
  type AssistantBlockSummary,
} from '@scratch-mobile/assistant-contracts';
import { createDevelopmentProposal } from '../src/features/assistant/developmentExamples';

it('covers all supported statement kinds using valid fixed proposals', () => {
  const proposal = createDevelopmentProposal('all-blocks', []);
  expect(parseAssistantProposal(proposal)).toEqual(proposal);
  const operation = proposal.operations[0];
  if (operation.kind !== 'replaceMainScript')
    throw new Error('Expected create');
  expect(
    new Set(operation.statements.map(statement => statement.kind)),
  ).toEqual(new Set(ASSISTANT_CAPABILITIES.map(capability => capability.kind)));
});

it('keeps the basic motor example deterministic and returns fresh data', () => {
  const proposal = createDevelopmentProposal('motor', []);
  expect(proposal.operations).toEqual([
    {
      kind: 'replaceMainScript',
      statements: [
        { kind: 'motor.runPower', port: 4, power: 30 },
        { kind: 'control.sleep', seconds: 1 },
        { kind: 'motor.stop', port: 4 },
      ],
    },
  ]);
  proposal.operations.length = 0;
  expect(createDevelopmentProposal('motor', []).operations).toHaveLength(1);
});

it('modifies the real wait block ID without mutating the snapshot', () => {
  const blocks: AssistantBlockSummary[] = [
    {
      id: 'wait-real-id',
      type: 'control_sleep',
      role: 'statement',
      fields: {},
      inputNames: [],
      statement: { kind: 'control.sleep', seconds: 1 },
    },
  ];
  expect(createDevelopmentProposal('update-wait', blocks).operations).toEqual([
    { kind: 'updateStatement', blockId: 'wait-real-id', patch: { seconds: 3 } },
  ]);
  expect(blocks[0].statement).toEqual({ kind: 'control.sleep', seconds: 1 });
  expect(() => createDevelopmentProposal('update-wait', [])).toThrow(
    '没有可修改的等待积木',
  );
});
