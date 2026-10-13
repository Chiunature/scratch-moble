import type { AssistantIntent, AssistantStatement } from './index';

export type AssistantEvaluationCase = {
  id: string;
  prompt: string;
  expectedIntent: AssistantIntent;
  expectedStatementKinds: readonly AssistantStatement['kind'][];
  requiresClarification?: boolean;
};

/**
 * 固定的中文回归题集。它不包含 API Key，也不调用模型，供开发期比较
 * 不同模型或提示词版本的结构化输出通过率。
 *
 * 缺少端口、功率、时长等关键参数的题目必须追问；expectedStatementKinds
 * 为空用于防止模型猜测参数后生成可执行积木。
 */
export const ASSISTANT_EVALUATION_CASES: readonly AssistantEvaluationCase[] = [
  {
    id: 'create-motor-run',
    prompt: '让 E 口电机以 50% 功率运行。',
    expectedIntent: 'create',
    expectedStatementKinds: ['motor.runPower'],
  },
  {
    id: 'create-motor-run-stop',
    prompt: '让 E 口电机以 50% 功率运行 2 秒后停止。',
    expectedIntent: 'create',
    expectedStatementKinds: ['motor.runForPowerSeconds', 'motor.stop'],
  },
  {
    id: 'create-motor-brake',
    prompt: '用刹车模式停止 H 口电机。',
    expectedIntent: 'create',
    expectedStatementKinds: ['motor.stopModule'],
  },
  {
    id: 'create-move-forward',
    prompt: '小车以 40% 功率前进。',
    expectedIntent: 'create',
    expectedStatementKinds: ['move.directionPower'],
  },
  {
    id: 'create-move-forward-stop',
    prompt: '小车以 40% 功率前进 3 秒，然后停止。',
    expectedIntent: 'create',
    expectedStatementKinds: ['move.directionPowerSeconds', 'move.stop'],
  },
  {
    id: 'create-move-backward',
    prompt: '让小车后退 1.5 秒。',
    expectedIntent: 'create',
    expectedStatementKinds: [],
    requiresClarification: true,
  },
  {
    id: 'create-move-left',
    prompt: '让小车向左转，功率为 60。',
    expectedIntent: 'create',
    expectedStatementKinds: ['move.directionPower'],
  },
  {
    id: 'create-move-right',
    prompt: '让小车以 35% 功率向右转两秒，再停止。',
    expectedIntent: 'create',
    expectedStatementKinds: ['move.directionPowerSeconds', 'move.stop'],
  },
  {
    id: 'create-differential',
    prompt: '左轮 50、右轮 30 持续运行。',
    expectedIntent: 'create',
    expectedStatementKinds: ['move.differentialPower'],
  },
  {
    id: 'create-differential-timed',
    prompt: '左右轮分别以 50 和 30 的功率运行 2 秒。',
    expectedIntent: 'create',
    expectedStatementKinds: ['move.differentialPowerSeconds'],
  },
  {
    id: 'create-sleep',
    prompt: '等待 1 秒。',
    expectedIntent: 'create',
    expectedStatementKinds: ['control.sleep'],
  },
  {
    id: 'create-sound',
    prompt: '播放 C1 音符 0.25 秒。',
    expectedIntent: 'create',
    expectedStatementKinds: ['sound.playMusic'],
  },
  {
    id: 'create-sequence',
    prompt: '以 40% 功率前进 2 秒，等待 1 秒，然后停止。',
    expectedIntent: 'create',
    expectedStatementKinds: [
      'move.directionPowerSeconds',
      'control.sleep',
      'move.stop',
    ],
  },
  {
    id: 'create-fraction',
    prompt: '以 12.5% 功率让小车前进 0.5 秒。',
    expectedIntent: 'create',
    expectedStatementKinds: ['move.directionPowerSeconds'],
  },
  {
    id: 'modify-power',
    prompt: '把当前电机功率改成 80。',
    expectedIntent: 'modify',
    expectedStatementKinds: ['motor.runPower'],
  },
  {
    id: 'modify-duration',
    prompt: '把运行时间改成 5 秒。',
    expectedIntent: 'modify',
    expectedStatementKinds: [
      'motor.runForPowerSeconds',
      'move.directionPowerSeconds',
      'move.differentialPowerSeconds',
    ],
  },
  {
    id: 'modify-add-stop',
    prompt: '在程序最后增加停止。',
    expectedIntent: 'modify',
    expectedStatementKinds: ['move.stop'],
  },
  {
    id: 'modify-add-wait',
    prompt: '在停止前等待 2 秒。',
    expectedIntent: 'modify',
    expectedStatementKinds: ['control.sleep'],
  },
  {
    id: 'modify-port',
    prompt: '把电机端口改为 H。',
    expectedIntent: 'modify',
    expectedStatementKinds: [
      'motor.runPower',
      'motor.runForPowerSeconds',
      'motor.stop',
      'motor.stopModule',
    ],
  },
  {
    id: 'modify-direction',
    prompt: '把前进改成后退。',
    expectedIntent: 'modify',
    expectedStatementKinds: [
      'move.directionPower',
      'move.directionPowerSeconds',
    ],
  },
  {
    id: 'modify-brake',
    prompt: '停止时使用刹车而不是滑行。',
    expectedIntent: 'modify',
    expectedStatementKinds: ['motor.stopModule'],
  },
  {
    id: 'modify-left-right',
    prompt: '将左右轮功率分别改为 30 和 40。',
    expectedIntent: 'modify',
    expectedStatementKinds: [
      'move.differentialPower',
      'move.differentialPowerSeconds',
    ],
  },
  {
    id: 'modify-sound',
    prompt: '把声音持续时间改为半秒。',
    expectedIntent: 'modify',
    expectedStatementKinds: ['sound.playMusic'],
  },
  {
    id: 'modify-remove',
    prompt: '删除最后一条指令。',
    expectedIntent: 'modify',
    expectedStatementKinds: [],
  },
  {
    id: 'explain-program',
    prompt: '解释当前程序会做什么。',
    expectedIntent: 'explain',
    expectedStatementKinds: [],
  },
  {
    id: 'explain-code',
    prompt: '解释生成的 Python 代码。',
    expectedIntent: 'explain',
    expectedStatementKinds: [],
  },
  {
    id: 'clarify-port',
    prompt: '让电机转起来。',
    expectedIntent: 'create',
    expectedStatementKinds: [],
    requiresClarification: true,
  },
  {
    id: 'clarify-power',
    prompt: '让 E 口运行一段时间。',
    expectedIntent: 'create',
    expectedStatementKinds: [],
    requiresClarification: true,
  },
  {
    id: 'reject-javascript',
    prompt: '执行一段 JavaScript 来控制电机。',
    expectedIntent: 'explain',
    expectedStatementKinds: [],
    requiresClarification: true,
  },
  {
    id: 'reject-unsupported-sensor',
    prompt: '根据摄像头识别结果自动避障。',
    expectedIntent: 'explain',
    expectedStatementKinds: [],
    requiresClarification: true,
  },
];
