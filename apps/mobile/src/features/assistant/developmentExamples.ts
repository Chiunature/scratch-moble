import {
  parseAssistantCodeResponse,
  type AssistantCodeResponse,
} from '@scratch-mobile/assistant-contracts';

export type DevelopmentExampleId =
  | 'motor'
  | 'all-blocks'
  | 'loop-var'
  | 'sensor-matrix'
  | 'custom-block';

export const DEVELOPMENT_EXAMPLES: readonly {
  id: DevelopmentExampleId;
  label: string;
}[] = [
  { id: 'motor', label: '电机与等待示例' },
  { id: 'all-blocks', label: '全部 11 类积木' },
  { id: 'loop-var', label: '循环与变量示例' },
  { id: 'sensor-matrix', label: '传感器与矩阵灯示例' },
  { id: 'custom-block', label: '数字孔和是否孔' },
];

const PYTHON: Record<DevelopmentExampleId, string> = {
  motor: ['_motor.run_power(4, 30)', '_os.sleep_s(1)', '_motor.stop(4)'].join(
    '\n',
  ),
  'all-blocks': [
    '_motor.run_power(4, 30)',
    '_motor.run_for_power_seconds(5, -20, 2)',
    '_motor.stop(6)',
    '_motor.stop_module(7, 1)',
    "_motor.mov_dir_power('advance', 40)",
    "_motor.mov_dir_power_seconds('retreat', 30, 1.5)",
    '_motor.mov_power(50, 30)',
    '_motor.mov_for_power_seconds(40, -40, 3)',
    '_motor.mov_stop()',
    '_os.sleep_s(1)',
    "_beep.play_muic('C2', 0.25)",
  ].join('\n'),
  'loop-var': [
    '# @var speed => 速度',
    'speed = 40',
    'while not (_touch.state(0)):',
    '    _motor.mov_dir_power(\'advance\', speed)',
    '    _os.sleep_s(0.2)',
    '_motor.mov_stop()',
  ].join('\n'),
  'sensor-matrix': [
    'if _color.cmp_lux(0, \'>\', 50):',
    '    _matrix.show(0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F)',
    'else:',
    '    _matrix.clear()',
    '_os.resetTimer()',
  ].join('\n'),
  'custom-block': [
    '# @custom qianjin => 前进 %n %b',
    '# @custom-arg qianjin bushu => 步数',
    '# @custom-arg qianjin kaiguan => 开关',
    'def qianjin(bushu, kaiguan):',
    '    if kaiguan:',
    "        _motor.mov_dir_power('advance', bushu)",
    'qianjin(40, not _touch.state(0))',
  ].join('\n'),
};

const SUMMARY: Record<DevelopmentExampleId, string> = {
  motor: '本地固定示例：E 口电机以 30% 功率运行，等待 1 秒后停止。',
  'all-blocks': '本地固定示例：生成全部 11 类直线积木。',
  'loop-var': '本地固定示例：直到触碰传感器触发前前进，然后停车。',
  'sensor-matrix': '本地固定示例：灰度大于 50 时点亮矩阵，否则熄灭。',
  'custom-block': '本地固定示例：自制积木「前进」带数字孔步数和是否孔开关。',
};

export function createDevelopmentCode(
  id: DevelopmentExampleId,
): AssistantCodeResponse {
  return parseAssistantCodeResponse({
    type: 'code',
    message: SUMMARY[id],
    python: PYTHON[id],
    assumptions: [],
    questions: [],
    hardware_config: {},
  });
}
