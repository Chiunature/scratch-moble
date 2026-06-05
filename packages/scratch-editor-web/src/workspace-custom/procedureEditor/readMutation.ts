import type { ProcedureDeclarationBlock } from './procedureWorkspace';

export function readProcedureMutation(
  block: ProcedureDeclarationBlock | null,
): Element | null {
  if (!block?.mutationToDom) {
    return null;
  }
  block.onChangeFn?.();
  return block.mutationToDom();
}
