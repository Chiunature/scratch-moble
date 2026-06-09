import { valueToPython } from '../expressions';
import {
  childContext,
  getInputTargetBlock,
  getNextBlock,
  joinLines,
  line,
} from '../helpers';
import {
  procedureParamNamesFromProcCode,
  procedureParamNamesFromProto,
  resolveProcedurePythonName,
} from '../procedureNames';
import { prependGlobalDeclaration } from '../workspaceVariables';
import type { ScratchBlock, StatementGenerator } from '../types';
import type { StatementChainFn } from './types';

type BlockWithProcCode = ScratchBlock & { getProcCode?: () => string };

function getProcCodeFromBlock(block: ScratchBlock): string {
  return (block as BlockWithProcCode).getProcCode?.() ?? '';
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

export function createProcedureStatementGenerators(
  statementChainToPython: StatementChainFn,
): Record<string, StatementGenerator> {
  return {
    procedures_call(block, context) {
      const procCode = getProcCodeFromBlock(block);
      const fn = resolveProcedurePythonName(procCode, context.procedureNames);
      const args = procedureCallArgsToPython(block);
      return line(context, `${fn}(${args})`);
    },
    procedures_definition(block, context) {
      const proto = getInputTargetBlock(block, 'custom_block');
      const procCode = proto ? getProcCodeFromBlock(proto) : '';
      const fn = resolveProcedurePythonName(procCode, context.procedureNames);
      const inner = childContext({
        ...context,
        currentProcedureProcCode: procCode,
      });
      const next = getNextBlock(block);
      const body = prependGlobalDeclaration(
        next ? statementChainToPython(next, inner) : line(inner, 'pass'),
        inner,
      );
      const params =
        context.procedureArguments?.get(procCode)?.paramNames ??
        (proto
          ? procedureParamNamesFromProto(
              proto as ScratchBlock & { displayNames_?: string[] },
            )
          : procedureParamNamesFromProcCode(procCode));
      const signature =
        params.length > 0 ? `def ${fn}(${params.join(', ')}):` : `def ${fn}():`;
      return joinLines(line(context, signature), body);
    },
  };
}
