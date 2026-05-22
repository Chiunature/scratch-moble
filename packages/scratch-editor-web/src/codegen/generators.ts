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

function expressionBlockToPython(block: ScratchBlock): string {
  if (NUMERIC_LITERAL_BLOCK_TYPES.has(block.type)) {
    return getFieldValue(block, 'NUM') ?? '0';
  }

  if (block.type === BLOCK_TYPES.common.portDropdown) {
    return getFieldValue(block, 'PORT') ?? '1';
  }

  if (block.type === 'text') {
    return quotePythonString(getFieldValue(block, 'TEXT') ?? '');
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
    const v = valueToPython(block, 'TIMES', '10');
    return `${indent(context)}matrix_light_show(${v})`;
  },

  [BLOCK_TYPES.sound.playMusic](_block, context) {
    return `${indent(context)}play_music()`;
  },

  [BLOCK_TYPES.control.sleepSeconds](block, context) {
    const v = valueToPython(block, 'STEPS', '1');
    return `${indent(context)}sleep_seconds(${v})`;
  },

  [BLOCK_TYPES.sensor.touch_sensor.oneCalibrate](_block, context) {
    return `${indent(context)}sensor_one_calibrate()`;
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

  return blocks
    .map(block => statementChainToPython(block, { indent: 0 }))
    .filter(Boolean)
    .join('\n\n');
}
