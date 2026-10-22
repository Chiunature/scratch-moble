import { z } from 'zod/v4';

import { AssistantContractError } from './contractError';
import type { AssistantProgramEdit } from './pythonProgramDiff';

export const ASSISTANT_PYTHON_CAPABILITY_VERSION = '1' as const;

const hardwarePort = z.string().trim().min(1).max(8);
const programEditSchema = z.strictObject({
  mode: z.enum(['revise', 'delete', 'keep-only', 'clear']),
  scope: z.enum(['main', 'procedures', 'workspace']),
  allow: z.array(z.enum(['add', 'remove', 'replace'])).max(3),
  add: z.array(z.string().max(500)).max(64),
  targets: z.array(z.string().max(500)).max(64),
  keep: z.array(z.string().max(500)).max(64),
  replacements: z
    .array(
      z.strictObject({
        from: z.string().max(500),
        to: z.string().max(500),
      }),
    )
    .max(64),
});

const codeOnlySchema = z.strictObject({
  type: z.literal('code'),
  message: z.string().trim().min(1).max(500),
  python: z.string().max(16_000),
  program_edit: programEditSchema,
  assumptions: z.array(z.string().trim().min(1).max(200)).max(8),
  questions: z.array(z.string().trim().min(1).max(200)).max(4),
  hardware_config: z.strictObject({
    left_motor: hardwarePort.nullish(),
    right_motor: hardwarePort.nullish(),
  }),
});

const readonlySchema = z.strictObject({
  type: z.enum(['question', 'explanation']),
  message: z.string().trim().min(1).max(500),
  python: z.string().max(16_000),
  assumptions: z.array(z.string().trim().min(1).max(200)).max(8),
  questions: z.array(z.string().trim().min(1).max(200)).max(4),
  hardware_config: z.strictObject({
    left_motor: hardwarePort.nullish(),
    right_motor: hardwarePort.nullish(),
  }),
});

const responseSchema = z.union([codeOnlySchema, readonlySchema]);

export type AssistantCodeResponse = {
  type: 'code' | 'question' | 'explanation';
  message: string;
  python: string;
  programEdit?: AssistantProgramEdit;
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

function validateProgramEditShape(edit: AssistantProgramEdit): string | null {
  if (edit.scope === 'workspace' && edit.mode !== 'clear') {
    return 'scope=workspace 只能与 mode=clear 一起使用';
  }
  return null;
}

export function parseAssistantCodeResponse(
  value: unknown,
): AssistantCodeResponse {
  const result = responseSchema.safeParse(value);
  if (!result.success) {
    throw new AssistantContractError([
      { path: '$', message: 'Python 响应结构无效' },
    ]);
  }
  const data = result.data;
  const python = data.python.trim();
  if (data.type !== 'code') {
    if (python) {
      throw new AssistantContractError([
        { path: '$.python', message: '提问或解释不能附带可执行 Python' },
      ]);
    }
    if ('program_edit' in data && data.program_edit != null) {
      throw new AssistantContractError([
        {
          path: '$.program_edit',
          message: '提问或解释不能附带 program_edit',
        },
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
      python: '',
      assumptions: data.assumptions,
      questions: data.questions,
      hardware_config: {
        left_motor: emptyToUndefined(data.hardware_config.left_motor),
        right_motor: emptyToUndefined(data.hardware_config.right_motor),
      },
    };
  }

  const programEdit: AssistantProgramEdit = {
    mode: data.program_edit.mode,
    scope: data.program_edit.scope,
    allow: [...data.program_edit.allow],
    add: [...data.program_edit.add],
    targets: [...data.program_edit.targets],
    keep: [...data.program_edit.keep],
    replacements: data.program_edit.replacements.map(item => ({
      from: item.from,
      to: item.to,
    })),
  };
  const shapeError = validateProgramEditShape(programEdit);
  if (shapeError) {
    throw new AssistantContractError([
      { path: '$.program_edit', message: shapeError },
    ]);
  }
  return {
    type: 'code',
    message: data.message,
    python,
    programEdit,
    assumptions: data.assumptions,
    questions: data.questions,
    hardware_config: {
      left_motor: emptyToUndefined(data.hardware_config.left_motor),
      right_motor: emptyToUndefined(data.hardware_config.right_motor),
    },
  };
}

const wireCodeSchema = codeOnlySchema.extend({
  hardware_config: z.strictObject({
    left_motor: hardwarePort.nullable(),
    right_motor: hardwarePort.nullable(),
  }),
});

const wireReadonlySchema = readonlySchema.extend({
  hardware_config: z.strictObject({
    left_motor: hardwarePort.nullable(),
    right_motor: hardwarePort.nullable(),
  }),
});

export const ASSISTANT_CODE_RESPONSE_JSON_SCHEMA = z.toJSONSchema(
  z.union([wireCodeSchema, wireReadonlySchema]),
  { target: 'draft-7' },
);

/** 注入模型的精简白名单。函数名与移动端 codegen 一致。 */
export const ASSISTANT_PYTHON_RULES = [
  '你是 Scratch Mobile 的积木助手。只输出受限 Spark AI Python，由本地反编译成积木。',
  '只返回 JSON，不要 Markdown。type 为 code、question 或 explanation。',
  'code 必须给出完整主程序 python，并必须声明 program_edit；缺少 program_edit 会被拒绝。',
  'program_edit 字段：mode(revise|delete|keep-only|clear)、scope(main|procedures|workspace)、allow、add、targets、keep、replacements。',
  'revise：小改。每条删除必须写在 replacements.from，对应 to；纯新增写在 add。不要用新增数量抵消无关删除。',
  'delete：删除写在 targets；若同时新增或替换，allow 必须含 add/replace，并填写 add 或 replacements。',
  'keep-only：只保留 keep 中的语句；keep 为空表示主程序可空，不代表清空工作区。',
  'clear + scope=main：清空绿旗主程序。clear + scope=workspace：清空整个工作区（积木和变量），python 必须为空字符串。',
  'scope=workspace 只能与 clear 一起用。修改或删除自制积木定义时用 scope=procedures。',
  '小改时仍输出完整主程序，但必须保留用户未要求删除的语句；program_edit 必须如实声明变更。',
  'question / explanation 不要带 python，也不要带 program_edit。信息不足时先提问，不要猜测端口或功率。',
  '修复重试时必须原样保留已锁定的 program_edit，不得改成更宽的 mode/scope/allow。',
  '不要输出 import、class、lambda、try、with、列表推导或任意未列出的函数。',
  '自制积木写在最外层，并在 def 前写注释。%n 是数字孔，%b 是是否孔，孔的个数必须和参数个数相同。',
  '# @custom qianjin => 前进 %n',
  '# @custom-arg qianjin bushu => 步数',
  'def qianjin(bushu):',
  '    _motor.mov_dir_power("advance", bushu)',
  '# @custom go => 执行 %b',
  'def go(kai):',
  '    if kai:',
  '        _motor.mov_stop()',
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
  '_motor.pair(leftPort, rightPort, direction)  # 电机口 4-7，direction 0..3',
  '_motor.mov_set_stop_module(mode)  # mode 为 0 滑行或 1 刹车',
  "_motor.mov_dir_power('advance'|'retreat'|'left'|'right', power)",
  "_motor.mov_dir_power_seconds(direction, power, seconds)",
  '_motor.mov_power(left, right)',
  '_motor.mov_for_power_seconds(left, right, seconds)',
  '_motor.mov_stop()',
  '_motor.mov_find_line_init()',
  '_motor.mov_find_line_run(leftSensor, rightSensor, leftPower, rightPower, kp, kd)',
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
  '控制流：while True、while not (条件)、for count in range(次数)、if / elif / else、break。elif 可以写多级。',
  '变量：name = 表达式，name += 表达式。',
  '列表语句：name.append(item)、name.insert(index, item)、name.set(index, item)、name.remove_index(index)、name.remove_all()。',
  '列表取值：name[index]、name.num()、name.list_if_data(item)、name.dataToindex(item)。',
  '运算：+ - * / %、== < >、and/or/not、_random.randint(a, b)、_math.round(n)、_math.abs/floor/ceil/sqrt。',
  '字符串：str(a) + str(b)、len(s)、(str(子) in str(母))、(str(s)[int(i) - 1])。',
  '角度：_math.sin(_math.radians(n)) 等同理；反正弦 _math.degrees(_math.asin(n))；10 的幂 _math.pow(10, n)。',
  '条件与数值还可以使用字面量、变量、比较、括号，以及：',
  '_touch.state(port)、_color.lux(port)、_color.lux_state(port)、_color.cmp_lux(port, op, value)',
  '_ultrasion.value(port)、_ultrasion.cmp_value(port, op, value)',
  "_key.key_remote('up'|'down'|'left'|'right'|'y'|'a'|'x'|'b', 'press'|'unpress')",
  "_key.key_mast('left'|'right', 0|1)、_os.timer()",
  '_key.read_adcance_left_offset()',
  '_key.read_advance_right_offset()',
  '_key.read_retreat_left_offset()',
  '_key.read_retreat_right_offset()',
].join('\n');
