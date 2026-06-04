/**
 * 积木 → Python 代码生成器。
 *
 * - expressionBlockToPython：处理嵌在输入槽里的值（数字、文本等）
 * - statementGenerators：每种语句积木对应的生成函数，按 block.type 索引
 * - statementChainToPython：沿 next 链遍历同一级的一串积木
 * - renderPythonCode：从工作区顶层积木开始，生成完整的 Python 代码字符串
 *
 * 新增积木时只需在 statementGenerators 里追加一个 key-function 对即可。
 */
import {
  parsePortFieldValue,
  matrixLightRowsToPythonArgs,
  pitchToDisplayName,
  clampNotePitch,
  normalizeHandleShankKey,
} from '@scratch-mobile/shared';

import {
  BLOCK_TYPES,
  CUSTOM_NUMERIC_LITERAL_TYPES,
} from '../blocks/blockTypes';
import {
  getFieldValue,
  getInputTargetBlock,
  getNextBlock,
  indent,
  quotePythonString,
} from './helpers';
import type {
  GenerateContext,
  ScratchBlock,
  StatementGenerator,
  Workspace,
} from './types';

/**
 * 作为「表达式」嵌在输入槽里的纯数字字面量块（含飞出栏默认阴影类型）。
 * 均使用字段 NUM，与 scratch-blocks 内置定义一致。
 */
const NUMERIC_LITERAL_BLOCK_TYPES = new Set([
  'math_number',
  'math_positive_number',
  'math_whole_number',
  'math_integer',
  ...CUSTOM_NUMERIC_LITERAL_TYPES,
]);

function inputExpressionToPython(
  block: ScratchBlock,
  inputName: string,
  fallback: string,
): string {
  const target = getInputTargetBlock(block, inputName);
  return target ? expressionBlockToPython(target) : fallback;
}

function expressionBlockToPython(block: ScratchBlock): string {
  if (NUMERIC_LITERAL_BLOCK_TYPES.has(block.type)) {
    return getFieldValue(block, 'NUM') ?? '0';
  }

  if (block.type === BLOCK_TYPES.common.portDropdown) {
    const raw = getFieldValue(block, 'PORT') ?? '0';
    const ports = parsePortFieldValue(raw);
    if (ports.length === 1) {
      return ports[0]!;
    }
    return `[${ports.join(', ')}]`;
  }

  if (block.type === 'text') {
    return quotePythonString(getFieldValue(block, 'TEXT') ?? '');
  }

  if (block.type === BLOCK_TYPES.common.notePicker) {
    const raw = getFieldValue(block, 'NOTE') ?? '12';
    const pitch = Number(raw);
    const name = Number.isFinite(pitch)
      ? pitchToDisplayName(clampNotePitch(pitch))
      : raw;
    return quotePythonString(name);
  }

  if (block.type === BLOCK_TYPES.common.handleShankPicker) {
    const raw = getFieldValue(block, 'HANDLESHANK') ?? 'up';
    return quotePythonString(normalizeHandleShankKey(raw));
  }

  if (block.type === 'operator_add') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} + ${inputExpressionToPython(block, 'NUM2', '0')})`;
  }
  if (block.type === 'operator_subtract') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} - ${inputExpressionToPython(block, 'NUM2', '0')})`;
  }
  if (block.type === 'operator_multiply') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} * ${inputExpressionToPython(block, 'NUM2', '0')})`;
  }
  if (block.type === 'operator_divide') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} / ${inputExpressionToPython(block, 'NUM2', '1')})`;
  }
  if (block.type === 'operator_random') {
    return `random.randint(int(${inputExpressionToPython(block, 'FROM', '1')}), int(${inputExpressionToPython(block, 'TO', '10')}))`;
  }
  if (block.type === 'operator_mod') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} % ${inputExpressionToPython(block, 'NUM2', '1')})`;
  }
  if (block.type === 'operator_round') {
    return `round(${inputExpressionToPython(block, 'NUM', '0')})`;
  }
  if (block.type === 'operator_mathop') {
    const op = getFieldValue(block, 'OPERATOR') ?? 'abs';
    const num = inputExpressionToPython(block, 'NUM', '0');
    switch (op) {
      case 'abs':
        return `abs(${num})`;
      case 'floor':
        return `math.floor(${num})`;
      case 'ceiling':
        return `math.ceil(${num})`;
      case 'sqrt':
        return `math.sqrt(${num})`;
      case 'sin':
        return `math.sin(math.radians(${num}))`;
      case 'cos':
        return `math.cos(math.radians(${num}))`;
      case 'tan':
        return `math.tan(math.radians(${num}))`;
      case 'asin':
        return `math.degrees(math.asin(${num}))`;
      case 'acos':
        return `math.degrees(math.acos(${num}))`;
      case 'atan':
        return `math.degrees(math.atan(${num}))`;
      case 'ln':
        return `math.log(${num})`;
      case 'log':
        return `math.log10(${num})`;
      case 'e ^':
        return `math.exp(${num})`;
      case '10 ^':
        return `(10 ** ${num})`;
      default:
        return `None  # TODO: unsupported mathop ${op}`;
    }
  }
  if (block.type === 'operator_equals') {
    return `(${inputExpressionToPython(block, 'OPERAND1', '0')} == ${inputExpressionToPython(block, 'OPERAND2', '0')})`;
  }
  if (block.type === 'operator_lt') {
    return `(${inputExpressionToPython(block, 'OPERAND1', '0')} < ${inputExpressionToPython(block, 'OPERAND2', '0')})`;
  }
  if (block.type === 'operator_gt') {
    return `(${inputExpressionToPython(block, 'OPERAND1', '0')} > ${inputExpressionToPython(block, 'OPERAND2', '0')})`;
  }
  if (block.type === 'operator_and') {
    return `(${inputExpressionToPython(block, 'OPERAND1', 'False')} and ${inputExpressionToPython(block, 'OPERAND2', 'False')})`;
  }
  if (block.type === 'operator_or') {
    return `(${inputExpressionToPython(block, 'OPERAND1', 'False')} or ${inputExpressionToPython(block, 'OPERAND2', 'False')})`;
  }
  if (block.type === 'operator_not') {
    return `(not ${inputExpressionToPython(block, 'OPERAND', 'False')})`;
  }
  if (block.type === 'operator_join') {
    return `str(${inputExpressionToPython(block, 'STRING1', "''")}) + str(${inputExpressionToPython(block, 'STRING2', "''")})`;
  }
  if (block.type === 'operator_letter_of') {
    const index = inputExpressionToPython(block, 'LETTER', '1');
    const text = inputExpressionToPython(block, 'STRING', "''");
    return `(str(${text})[max(0, int(${index}) - 1)] if str(${text}) else '')`;
  }
  if (block.type === 'operator_length') {
    return `len(str(${inputExpressionToPython(block, 'STRING', "''")}))`;
  }
  if (block.type === 'operator_contains') {
    const haystack = inputExpressionToPython(block, 'STRING1', "''");
    const needle = inputExpressionToPython(block, 'STRING2', "''");
    return `(str(${needle}) in str(${haystack}))`;
  }

  if (block.type === 'data_variable') {
    return variableFieldToPython(block, 'VARIABLE');
  }
  if (block.type === 'data_listcontents') {
    return variableFieldToPython(block, 'LIST');
  }
  if (block.type === 'data_itemoflist') {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    return `${lst}[int(${index}) - 1]`;
  }
  if (block.type === 'data_lengthoflist') {
    return `len(${variableFieldToPython(block, 'LIST')})`;
  }
  if (block.type === 'data_listcontainsitem') {
    const lst = variableFieldToPython(block, 'LIST');
    const item = valueToPython(block, 'ITEM', 'None');
    return `(${item} in ${lst})`;
  }
  if (block.type === 'data_itemnumoflist') {
    const lst = variableFieldToPython(block, 'LIST');
    const item = valueToPython(block, 'ITEM', 'None');
    return `(${lst}.index(${item}) + 1 if ${item} in ${lst} else 0)`;
  }

  return `None  # TODO: unsupported expression ${block.type}`;
}

function valueToPython(
  block: ScratchBlock,
  inputName: string,
  fallback: string,
): string {
  const targetBlock = getInputTargetBlock(block, inputName);
  return targetBlock ? expressionBlockToPython(targetBlock) : fallback;
}

function variableFieldToPython(block: ScratchBlock, fieldName: string): string {
  const name = getFieldValue(block, fieldName);
  if (!name) {
    return 'unnamed_var';
  }
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `_${name.replace(/\W/g, '_')}`;
}

function procCodeToPythonIdentifier(procCode: string): string {
  const base = procCode
    .replace(/%[nsb]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return base && /^[A-Za-z_]/.test(base) ? base : `proc_${base || 'block'}`;
}

type BlockWithProcCode = ScratchBlock & { getProcCode?: () => string };

function getProcCodeFromBlock(block: ScratchBlock): string {
  const procCode = (block as BlockWithProcCode).getProcCode?.();
  return procCode ?? '';
}

function procedureCallArgsToPython(block: ScratchBlock): string {
  const argExprs: string[] = [];
  for (const input of block.inputList ?? []) {
    if (input.type !== 1 || input.name === 'custom_block') {
      continue;
    }
    argExprs.push(valueToPython(block, input.name, 'None'));
  }
  return argExprs.join(', ');
}

/** play_music 第一参：统一输出带引号的音名字符串（非 pitch 整数）。 */
function noteValueToPython(
  block: ScratchBlock,
  inputName: string,
  defaultPitch: number,
): string {
  const targetBlock = getInputTargetBlock(block, inputName);
  if (!targetBlock) {
    return quotePythonString(pitchToDisplayName(defaultPitch));
  }

  if (targetBlock.type === BLOCK_TYPES.common.notePicker) {
    return expressionBlockToPython(targetBlock);
  }

  if (NUMERIC_LITERAL_BLOCK_TYPES.has(targetBlock.type)) {
    const raw = getFieldValue(targetBlock, 'NUM') ?? String(defaultPitch);
    const pitch = Number(raw);
    if (Number.isFinite(pitch)) {
      return quotePythonString(pitchToDisplayName(clampNotePitch(pitch)));
    }
  }

  if (targetBlock.type === 'text') {
    return expressionBlockToPython(targetBlock);
  }

  return quotePythonString(pitchToDisplayName(defaultPitch));
}

function nestedStatementsToPython(
  block: ScratchBlock,
  inputName: string,
  context: GenerateContext,
): string {
  const inner = getInputTargetBlock(block, inputName);
  if (!inner) {
    return `${indent({ indent: context.indent + 1 })}pass`;
  }
  return statementChainToPython(inner, { indent: context.indent + 1 });
}

const statementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.event.whenFlagClicked](_block, context) {
    return `${indent(context)}# 当开始运行`;
  },

  // 端口、功率、秒数 → 固件侧自行实现 motor_run_for_power_seconds
  [BLOCK_TYPES.motor.runForPowerSeconds](block, context) {
    const port = valueToPython(block, 'PORTS', '1');
    const power = valueToPython(block, 'POWER', '50');
    const seconds = valueToPython(block, 'SECONDS', '2');
    return `${indent(
      context,
    )}motor_run_for_power_seconds(${port}, ${power}, ${seconds})`;
  },

  // 端口、功率（无时长）
  [BLOCK_TYPES.motor.runPower](block, context) {
    const port = valueToPython(block, 'PORTS', '1');
    const power = valueToPython(block, 'POWER', '50');
    return `${indent(context)}motor_run_power(${port}, ${power})`;
  },

  // 仅关断端口
  [BLOCK_TYPES.motor.stop](block, context) {
    const port = valueToPython(block, 'PORTS', '1');
    return `${indent(context)}motor_stop(${port})`;
  },

  [BLOCK_TYPES.motor.stopModule](block, context) {
    const port = valueToPython(block, 'PORTS', '1');
    const mode = valueToPython(block, 'BLOCK', '0');
    return `${indent(context)}motor_stop_module(${port}, ${mode})`;
  },

  [BLOCK_TYPES.move.pair](_block, context) {
    return `${indent(context)}move_pair()`;
  },

  [BLOCK_TYPES.matrixLight.show](block, context) {
    const matrix = getFieldValue(block, 'MATRIX') ?? '1F,1F,1F,1F,1F,1F,1F';
    return `${indent(context)}_matrix.show(${matrixLightRowsToPythonArgs(
      matrix,
    )})`;
  },

  [BLOCK_TYPES.sound.playMusic](block, context) {
    const note = noteValueToPython(block, 'NOTE', 12);
    const duration = valueToPython(block, 'DURATION', '1');
    return `${indent(context)}play_music(${note}, ${duration})`;
  },

  [BLOCK_TYPES.control.sleepS](block, context) {
    const v = valueToPython(block, 'SECONDS', '1');
    return `${indent(context)}sleep_s(${v})`;
  },

  [BLOCK_TYPES.control.wait](block, context) {
    const cond = valueToPython(block, 'CONDITION', 'False');
    return `${indent(context)}while not (${cond}):\n${indent({ indent: context.indent + 1 })}pass`;
  },

  [BLOCK_TYPES.control.break](_block, context) {
    return `${indent(context)}break`;
  },

  [BLOCK_TYPES.control.whileTimes](block, context) {
    const times = valueToPython(block, 'TIMES', '10');
    const body = nestedStatementsToPython(block, 'SUBSTACK', context);
    return `${indent(context)}for _ in range(int(${times})):\n${body}`;
  },

  [BLOCK_TYPES.sensor.gray_sensor.oneCalibrate](_block, context) {
    return `${indent(context)}sensor_one_calibrate()`;
  },

  data_setvariableto(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    const value = valueToPython(block, 'VALUE', '0');
    return `${indent(context)}${name} = ${value}`;
  },
  data_changevariableby(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    const delta = valueToPython(block, 'VALUE', '1');
    return `${indent(context)}${name} = ${name} + (${delta})`;
  },
  data_showvariable(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    return `${indent(context)}# show variable ${name}`;
  },
  data_hidevariable(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    return `${indent(context)}# hide variable ${name}`;
  },
  data_addtolist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const item = valueToPython(block, 'ITEM', 'None');
    return `${indent(context)}${lst}.append(${item})`;
  },
  data_deleteoflist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    return `${indent(context)}del ${lst}[int(${index}) - 1]`;
  },
  data_deletealloflist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    return `${indent(context)}${lst}.clear()`;
  },
  data_insertatlist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    const item = valueToPython(block, 'ITEM', 'None');
    return `${indent(context)}${lst}.insert(int(${index}) - 1, ${item})`;
  },
  data_replaceitemoflist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    const item = valueToPython(block, 'ITEM', 'None');
    return `${indent(context)}${lst}[int(${index}) - 1] = ${item}`;
  },
  data_showlist(block, context) {
    const name = variableFieldToPython(block, 'LIST');
    return `${indent(context)}# show list ${name}`;
  },
  data_hidelist(block, context) {
    const name = variableFieldToPython(block, 'LIST');
    return `${indent(context)}# hide list ${name}`;
  },
  procedures_call(block, context) {
    const fn = procCodeToPythonIdentifier(getProcCodeFromBlock(block));
    const args = procedureCallArgsToPython(block);
    return `${indent(context)}${fn}(${args})`;
  },
  procedures_definition(block, context) {
    const proto = getInputTargetBlock(block, 'custom_block');
    const fn = procCodeToPythonIdentifier(
      proto ? getProcCodeFromBlock(proto) : '',
    );
    const next = getNextBlock(block);
    const body = next
      ? statementChainToPython(next, { indent: context.indent + 1 })
      : `${indent({ indent: context.indent + 1 })}pass`;
    return `${indent(context)}def ${fn}():\n${body}`;
  },
};

function blockToPython(block: ScratchBlock, context: GenerateContext): string {
  const generator = statementGenerators[block.type];

  if (!generator) {
    return `${indent(context)}# TODO: unsupported block ${block.type}`;
  }

  return generator(block, context);
}

function statementChainToPython(
  firstBlock: ScratchBlock,
  context: GenerateContext,
): string {
  const lines: string[] = [];
  let currentBlock: ScratchBlock | null = firstBlock;

  while (currentBlock) {
    lines.push(blockToPython(currentBlock, context));
    if (currentBlock.type === 'procedures_definition') {
      break;
    }
    currentBlock = getNextBlock(currentBlock);
  }

  return lines.join('\n');
}

export function renderPythonCode(workspace: Workspace): string {
  const blocks = workspace
    .getTopBlocks(true)
    .sort(
      (a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y,
    );

  if (blocks.length === 0) {
    return '# 拖拽飞出栏积木后生成 Python 代码';
  }

  const defs = blocks
    .filter(b => b.type === 'procedures_definition')
    .map(block => blockToPython(block, { indent: 0 }));
  const scripts = blocks
    .filter(b => b.type !== 'procedures_definition')
    .map(block => statementChainToPython(block, { indent: 0 }))
    .filter(Boolean);

  const sections = [...defs, ...scripts].filter(Boolean);
  return sections.length > 0
    ? sections.join('\n\n')
    : '# 拖拽飞出栏积木后生成 Python 代码';
}
