import { getInputTargetBlock, indent } from '../helpers';
import type { GenerateContext, ScratchBlock } from '../types';
import type { NestedStatementsFn, StatementChainFn } from './types';

export function createNestedStatementsToPython(
  statementChainToPython: StatementChainFn,
): NestedStatementsFn {
  return (
    block: ScratchBlock,
    inputName: string,
    context: GenerateContext,
  ): string => {
    const inner = getInputTargetBlock(block, inputName);
    if (!inner) {
      return `${indent({ indent: context.indent + 1 })}pass`;
    }
    return statementChainToPython(inner, { indent: context.indent + 1 });
  };
}
