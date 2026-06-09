/**
 * 积木 → Python 代码生成器。
 *
 * - expressions.ts：输入槽里的表达式值
 * - statements/：每种语句积木对应的生成函数，按分类拆分
 * - statementChainToPython：沿 next 链遍历同一级的一串积木
 * - renderPythonCode：从工作区顶层积木开始，生成完整的 Python 代码字符串
 */
import { BLOCK_TYPES } from '../blocks/blockTypes';
import { runWithGenerateContext } from './codegenScope';
import { getNextBlock, line } from './helpers';
import { buildStatementGenerators } from './statements';
import type {
  GenerateContext,
  ScratchBlock,
  Workspace,
} from './types';
import {
  buildProcedureArgumentRegistry,
  buildProcedureNameRegistry,
} from './procedureNames';
import {
  buildGlobalNames,
  collectWorkspaceVariables,
  renderGlobalDeclaration,
  renderVariableInitializers,
} from './workspaceVariables';

const EMPTY_WORKSPACE_HINT = '# 拖拽飞出栏积木后生成 Python 代码';
const NO_START_HAT_HINT = '# 请从「当程序启动时」积木开始搭建程序';

function blockToPython(block: ScratchBlock, context: GenerateContext): string {
  return runWithGenerateContext(context, () => {
    const generator = statementGenerators[block.type];

    if (!generator) {
      return line(context, `# TODO: unsupported block ${block.type}`);
    }

    return generator(block, context);
  });
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

function startHatScriptToPython(
  hat: ScratchBlock,
  context: GenerateContext,
): string {
  const firstStatement = getNextBlock(hat);
  if (!firstStatement) {
    return '';
  }
  return statementChainToPython(firstStatement, context);
}

function usesStructuredLayout(
  hasWorkspaceVariables: boolean,
  hasProcedureDefs: boolean,
): boolean {
  return hasWorkspaceVariables || hasProcedureDefs;
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

  const workspaceVariables = collectWorkspaceVariables(workspace);
  const globalNames = buildGlobalNames(workspaceVariables);
  const hasWorkspaceVariables = globalNames.length > 0;
  const procedureDefBlocks = blocks.filter(
    b => b.type === 'procedures_definition',
  );
  const procedureNames = buildProcedureNameRegistry(procedureDefBlocks);
  const procedureArguments = buildProcedureArgumentRegistry(procedureDefBlocks);
  const context: GenerateContext = {
    indent: 0,
    globalNames,
    procedureNames,
    procedureArguments,
  };

  const procedureDefs = procedureDefBlocks.map(block =>
    blockToPython(block, context),
  );
  const hasProcedureDefs = procedureDefs.length > 0;
  const startHats = blocks.filter(
    b => b.type === BLOCK_TYPES.event.whenFlagClicked,
  );
  const scripts = startHats
    .map(hat => startHatScriptToPython(hat, context))
    .filter(Boolean);
  const structured = usesStructuredLayout(
    hasWorkspaceVariables,
    hasProcedureDefs,
  );

  if (scripts.length === 0 && procedureDefs.length === 0) {
    if (hasWorkspaceVariables) {
      return renderVariableInitializers(workspaceVariables).join('\n');
    }
    return blocks.some(b => b.type !== BLOCK_TYPES.event.whenFlagClicked)
      ? NO_START_HAT_HINT
      : EMPTY_WORKSPACE_HINT;
  }

  if (!structured) {
    return scripts.join('\n') || EMPTY_WORKSPACE_HINT;
  }

  const sections: string[] = [];
  if (hasWorkspaceVariables) {
    sections.push(renderVariableInitializers(workspaceVariables).join('\n'));
  }
  if (hasProcedureDefs) {
    sections.push(procedureDefs.join('\n\n'));
  }

  const scriptBody = scripts.join('\n\n');
  if (scriptBody) {
    if (hasWorkspaceVariables) {
      const globalLine = renderGlobalDeclaration(globalNames);
      sections.push(
        globalLine ? `${globalLine}\n${scriptBody}` : scriptBody,
      );
    } else {
      sections.push(scriptBody);
    }
  }

  const code = sections.filter(Boolean).join('\n\n');
  return code || EMPTY_WORKSPACE_HINT;
}
