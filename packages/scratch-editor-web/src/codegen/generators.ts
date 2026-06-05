/**
 * 积木 → Python 代码生成器。
 *
 * - expressions.ts：输入槽里的表达式值
 * - statements/：每种语句积木对应的生成函数，按分类拆分
 * - statementChainToPython：沿 next 链遍历同一级的一串积木
 * - renderPythonCode：从工作区顶层积木开始，生成完整的 Python 代码字符串
 */
import { getNextBlock, indent } from './helpers';
import { buildStatementGenerators } from './statements';
import type {
  GenerateContext,
  ScratchBlock,
  Workspace,
} from './types';

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
