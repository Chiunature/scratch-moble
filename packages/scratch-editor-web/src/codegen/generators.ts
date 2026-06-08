/**
 * 积木 → Python 代码生成器。
 *
 * - expressions.ts：输入槽里的表达式值
 * - statements/：每种语句积木对应的生成函数，按分类拆分
 * - statementChainToPython：沿 next 链遍历同一级的一串积木
 * - renderPythonCode：从工作区顶层积木开始，生成完整的 Python 代码字符串
 */
import { BLOCK_TYPES } from '../blocks/blockTypes';
import { getNextBlock, indent } from './helpers';
import { buildStatementGenerators } from './statements';
import type {
  GenerateContext,
  ScratchBlock,
  Workspace,
} from './types';

const EMPTY_WORKSPACE_HINT = '# 拖拽飞出栏积木后生成 Python 代码';
const NO_START_HAT_HINT = '# 请从「当程序启动时」积木开始搭建程序';

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

const statementGenerators = buildStatementGenerators(statementChainToPython);

function startHatScriptToPython(hat: ScratchBlock): string {
  const lines = [blockToPython(hat, { indent: 0 })];
  const firstStatement = getNextBlock(hat);
  if (firstStatement) {
    lines.push(statementChainToPython(firstStatement, { indent: 0 }));
  }
  return lines.filter(Boolean).join('\n');
}

export function renderPythonCode(workspace: Workspace): string {
  const blocks = workspace
    .getTopBlocks(true)
    .sort(
      (a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y,
    );

  if (blocks.length === 0) {
    return EMPTY_WORKSPACE_HINT;
  }

  const defs = blocks
    .filter(b => b.type === 'procedures_definition')
    .map(block => blockToPython(block, { indent: 0 }));
  const startHats = blocks.filter(
    b => b.type === BLOCK_TYPES.event.whenFlagClicked,
  );
  const scripts = startHats.map(startHatScriptToPython).filter(Boolean);

  if (scripts.length === 0 && defs.length === 0) {
    return blocks.some(b => b.type !== BLOCK_TYPES.event.whenFlagClicked)
      ? NO_START_HAT_HINT
      : EMPTY_WORKSPACE_HINT;
  }

  const sections = [...defs, ...scripts].filter(Boolean);
  return sections.length > 0 ? sections.join('\n\n') : EMPTY_WORKSPACE_HINT;
}
