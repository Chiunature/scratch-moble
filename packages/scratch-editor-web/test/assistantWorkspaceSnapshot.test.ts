import { parseAssistantProposal } from '@scratch-mobile/assistant-contracts';

import { buildAssistantWorkspaceSnapshot } from '../src/assistant/buildWorkspaceSnapshot';

describe('buildAssistantWorkspaceSnapshot', () => {
  it('builds a deterministic hat and statement chain', () => {
    const proposal = parseAssistantProposal({
      schemaVersion: 1,
      intent: 'create',
      summary: '移动后停止',
      operations: [
        {
          kind: 'replaceMainScript',
          statements: [
            {
              kind: 'move.directionPowerSeconds',
              direction: 'advance',
              power: 50,
              seconds: 2,
            },
            { kind: 'move.stop' },
          ],
        },
      ],
    });

    const firstOperation = proposal.operations[0];
    if (firstOperation.kind !== 'replaceMainScript') {
      throw new Error('expected replaceMainScript');
    }

    const first = buildAssistantWorkspaceSnapshot(firstOperation.statements);
    const second = buildAssistantWorkspaceSnapshot(firstOperation.statements);
    expect(second).toEqual(first);

    const hat = first.blocks.blocks[0]!;
    expect(hat.type).toBe('event_when_flag_clicked');
    expect(hat.next?.block.type).toBe('mov_dir_power_seconds');
    expect(hat.next?.block.inputs?.POWER.shadow.fields).toEqual({ NUM: 50 });
    expect(hat.next?.block.next?.block.type).toBe('mov_stop');
  });

  it('uses project-specific shadow reporters for ports and notes', () => {
    const snapshot = buildAssistantWorkspaceSnapshot([
      { kind: 'motor.runPower', port: 7, power: -25 },
      { kind: 'sound.playMusic', note: 12, duration: 0.25 },
    ]);
    const first = snapshot.blocks.blocks[0]!.next!.block;
    const second = first.next!.block;

    expect(first.inputs?.PORTS.shadow).toMatchObject({
      type: 'motor_port_dropdown',
      fields: { PORT: '7' },
    });
    expect(second.inputs?.NOTE.shadow).toMatchObject({
      type: 'note_picker',
      fields: { NOTE: '12' },
    });
    expect(second.inputs?.DURATION.shadow.type).toBe(
      'math_positive_number_keyboard',
    );
  });
});
