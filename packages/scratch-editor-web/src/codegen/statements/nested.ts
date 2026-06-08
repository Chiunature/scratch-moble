import { childContext, getInputTargetBlock, line } from '../helpers';
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
    const inner = childContext(context);
    const first = getInputTargetBlock(block, inputName);
    if (!first) {
      return line(inner, '');
    }
    return statementChainToPython(first, inner);
  };
}
