import { valueToPython } from '../expressions';
import { getInputTargetBlock, getNextBlock, indent } from '../helpers';
import type { ScratchBlock, StatementGenerator } from '../types';
import type { StatementChainFn } from './types';

type BlockWithProcCode = ScratchBlock & { getProcCode?: () => string };

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

export function createProcedureStatementGenerators(
  statementChainToPython: StatementChainFn,
): Record<string, StatementGenerator> {
  return {
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
}
