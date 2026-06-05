import type { GenerateContext, ScratchBlock } from '../types';

export type StatementChainFn = (
  firstBlock: ScratchBlock,
  context: GenerateContext,
) => string;

export type NestedStatementsFn = (
  block: ScratchBlock,
  inputName: string,
  context: GenerateContext,
) => string;
