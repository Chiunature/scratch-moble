import { z } from 'zod/v4';

import { AssistantContractError } from './contractError';

export const ASSISTANT_PYTHON_CAPABILITY_VERSION = '1' as const;

const hardwarePort = z.string().trim().min(1).max(8);
const codeResponseSchema = z.strictObject({
  type: z.enum(['code', 'question', 'explanation']),
  message: z.string().trim().min(1).max(500),
  python: z.string().max(16_000),
  assumptions: z.array(z.string().trim().min(1).max(200)).max(8),
  questions: z.array(z.string().trim().min(1).max(200)).max(4),
  hardware_config: z.strictObject({
    left_motor: hardwarePort.nullish(),
    right_motor: hardwarePort.nullish(),
  }),
});

export type AssistantCodeResponse = {
  type: 'code' | 'question' | 'explanation';
  message: string;
  python: string;
  assumptions: string[];
  questions: string[];
  hardware_config: {
    left_motor?: string;
    right_motor?: string;
  };
};

function emptyToUndefined(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseAssistantCodeResponse(
  value: unknown,
): AssistantCodeResponse {
  const result = codeResponseSchema.safeParse(value);
  if (!result.success) {
    throw new AssistantContractError([
      { path: '$', message: 'Python 响应结构无效' },
    ]);
  }
  const data = result.data;
  const python = data.python.trim();
  if (data.type !== 'code' && python) {
    throw new AssistantContractError([
      { path: '$.python', message: '提问或解释不能附带可执行 Python' },
    ]);
  }
  if (data.type === 'question' && data.questions.length === 0) {
    throw new AssistantContractError([
      { path: '$.questions', message: '提问响应必须包含问题' },
    ]);
  }
  return {
    type: data.type,
    message: data.message,
    python,
    assumptions: data.assumptions,
    questions: data.questions,
    hardware_config: {
      left_motor: emptyToUndefined(data.hardware_config.left_motor),
      right_motor: emptyToUndefined(data.hardware_config.right_motor),
    },
  };
}

const wireSchema = codeResponseSchema.extend({
  hardware_config: z.strictObject({
    left_motor: hardwarePort.nullable(),
    right_motor: hardwarePort.nullable(),
  }),
});

export const ASSISTANT_CODE_RESPONSE_JSON_SCHEMA = z.toJSONSchema(wireSchema, {
  target: 'draft-7',
});

/** 注入模型的精简白名单。函数名与移动端 codegen 一致。 */
export const ASSISTANT_PYTHON_RULES = [
  '你是 Scratch Mobile 的积木助手。只输出受限 Spark AI Python，由本地反编译成积木。',
  '只返回 JSON，不要 Markdown。type 为 code、question 或 explanation。',
  'code 必须给出完整主程序 python，用来替换绿旗下的主程序；不要只给补丁。',
  '用户要求清空、删除全部积木或清空工作区时，返回 type=code，python 设为空字符串。',
  'question / explanation 的 python 必须为空字符串。信息不足时先提问，不要猜测端口或功率。',
  '不要输出 import、class、lambda、try、with、列表推导或任意未列出的函数。',
  '自制积木写在最外层，并在 def 前写注释。%n 是数字孔，%b 是是否孔，孔的个数必须和参数个数相同。',
  '# @custom qianjin => 前进 %n',
  '# @custom-arg qianjin bushu => 步数',
  'def qianjin(bushu):',
  '    _motor.mov_dir_power("advance", bushu)',
  '主程序单独一行调用，例如 qianjin(40)。没有注释时积木名用函数名，孔都是数字孔。',
  '不要手写 global，也不要写变量初始化行（x = 0 或 x = PikaStdData.List()）；编辑器会补。',
  '需要中文变量名时使用注释：# @var speed => 速度 或 # @list marks => 分数。',
  '循环体末尾不要写 _os.sleep_s(0.001)，编辑器会补。',
  '电机端口 E-H 用整数 4-7。传感器端口 A-D 用整数 0-3。功率 -100..100。',
  '允许的语句调用：',
  '_motor.run_power(port, power)',
  '_motor.run_for_power_seconds(port, power, seconds)',
  '_motor.stop(port)',
  '_motor.stop_module(port, mode)  # mode 为 0 滑行或 1 刹车',
  "_motor.mov_dir_power('advance'|'retreat'|'left'|'right', power)",
  "_motor.mov_dir_power_seconds(direction, power, seconds)",
  '_motor.mov_power(left, right)',
  '_motor.mov_for_power_seconds(left, right, seconds)',
  '_motor.mov_stop()',
  '_os.sleep_s(seconds)',
  '_os.stop_exit()',
  "_beep.play_muic('音名', duration)  # 例如 C、C1、C#2",
  '_color.set_color_threshold_value(port, value)',
  '_color.one_calibrate(port, seconds)',
  '_color.two_calibrate(portA, portB, seconds)',
  '_motor.mov_set_advance_offset(left, right)',
  '_motor.mov_set_retreat_offset(left, right)',
  '_os.resetTimer()',
  '_matrix.show(row0, row1, row2, row3, row4, row5, row6)  # 7 个 0x00..0x1F',
  '_matrix.clear()',
  '_matrix.set_brightness(level)',
  '_matrix.show_roll(str(text))',
  '_matrix.set_pixel_brightness(x, y, 0|1)',
  '控制流：while True、while not (条件)、for count in range(次数)、if / else、break。',
  '变量：name = 表达式，name += 表达式。列表：name.append(item)、name.insert(index, item)、name.set(index, item)、name.remove_index(index)、name.remove_all()。',
  '条件与数值可以使用字面量、变量、比较、and/or/not、括号，以及：',
  '_touch.state(port)、_color.lux(port)、_color.lux_state(port)、_color.cmp_lux(port, op, value)',
  '_ultrasion.value(port)、_ultrasion.cmp_value(port, op, value)',
  "_key.key_remote('up'|'down'|'left'|'right'|'y'|'a'|'x'|'b', 'press'|'unpress')",
  "_key.key_mast('left'|'right', 0|1)、_os.timer()、_key.read_adcance_left_offset() 等偏移读取。",
].join('\n');
