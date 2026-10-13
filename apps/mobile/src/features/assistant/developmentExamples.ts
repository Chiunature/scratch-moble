import {
  parseAssistantProposal,
  type AssistantBlockSummary,
  type AssistantProposal,
  type AssistantStatement,
} from '@scratch-mobile/assistant-contracts';

export type DevelopmentExampleId = 'motor' | 'all-blocks' | 'update-wait';

export const DEVELOPMENT_EXAMPLES: readonly {
  id: DevelopmentExampleId;
  label: string;
}[] = [
  { id: 'motor', label: '电机与等待示例' },
  { id: 'all-blocks', label: '全部 11 类积木' },
  { id: 'update-wait', label: '将首个等待改为 3 秒' },
];

// Available through development-only controls. These proposals use the same
// candidate validation, native compilation and confirmation as model proposals.
export function createDevelopmentProposal(
  id: DevelopmentExampleId,
  blocks: readonly AssistantBlockSummary[],
): AssistantProposal {
  if (id === 'update-wait') {
    const wait = blocks.find(
      block => block.statement?.kind === 'control.sleep',
    );
    if (!wait) {
      throw new Error(
        '当前作品没有可修改的等待积木。请先接受电机与等待示例，再测试参数修改。',
      );
    }
    return parseAssistantProposal({
      schemaVersion: 1,
      intent: 'modify',
      summary: '本地固定示例：将首个等待积木改为 3 秒，其余积木保持原样。',
      operations: [
        { kind: 'updateStatement', blockId: wait.id, patch: { seconds: 3 } },
      ],
    });
  }

  const statements: AssistantStatement[] =
    id === 'motor'
      ? [
          { kind: 'motor.runPower', port: 4, power: 30 },
          { kind: 'control.sleep', seconds: 1 },
          { kind: 'motor.stop', port: 4 },
        ]
      : [
          { kind: 'motor.runPower', port: 4, power: 30 },
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
        ];
  return parseAssistantProposal({
    schemaVersion: 1,
    intent: 'create',
    summary:
      id === 'motor'
        ? '本地固定示例：E 口电机以 30% 功率运行，等待 1 秒后停止。接受后将替换主程序。'
        : '本地固定示例：生成全部 11 类受支持积木，用于验证转换和编译。接受后将替换主程序。',
    operations: [{ kind: 'replaceMainScript', statements }],
  });
}
