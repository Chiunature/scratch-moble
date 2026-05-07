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
import { BLOCK_TYPES } from '../blocks/blockTypes';
import {
  getFieldValue,
  getInputTargetBlock,
  getNextBlock,
  indent,
  quotePythonString,
} from './helpers';
import type { GenerateContext, ScratchBlock, StatementGenerator, Workspace } from './types';

function expressionBlockToPython(block: ScratchBlock): string {
  if (block.type === 'math_number') {
    return getFieldValue(block, 'NUM') ?? '0';
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

function statementInputToPython(
  block: ScratchBlock,
  inputName: string,
  context: GenerateContext,
): string {
  const firstChildBlock = getInputTargetBlock(block, inputName);
  return firstChildBlock ? statementChainToPython(firstChildBlock, context) : '';
}

const statementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.whenFlagClicked](_block, context) {
    return `${indent(context)}# 当开始运行`;
  },

  [BLOCK_TYPES.moveSteps](block, context) {
    const steps = valueToPython(block, 'STEPS', '10');
    return `${indent(context)}move_steps(${steps})`;
  },

  [BLOCK_TYPES.turnRight](block, context) {
    const degrees = valueToPython(block, 'DEGREES', '15');
    return `${indent(context)}turn_right(${degrees})`;
  },

  [BLOCK_TYPES.sayForSecs](block, context) {
    const message = valueToPython(block, 'MESSAGE', quotePythonString('Hello'));
    const seconds = valueToPython(block, 'SECS', '2');
    return `${indent(context)}say_for_secs(${message}, ${seconds})`;
  },

  [BLOCK_TYPES.switchCostumeTo](block, context) {
    const costume = valueToPython(block, 'COSTUME', quotePythonString('costume1'));
    return `${indent(context)}switch_costume(${costume})`;
  },

  [BLOCK_TYPES.repeat](block, context) {
    const times = valueToPython(block, 'TIMES', '10');
    const childContext = { indent: context.indent + 1 };
    const body =
      statementInputToPython(block, 'SUBSTACK', childContext) ||
      `${indent(childContext)}pass`;

    return `${indent(context)}for _ in range(${times}):\n${body}`;
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
