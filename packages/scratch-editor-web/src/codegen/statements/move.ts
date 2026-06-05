import { BLOCK_TYPES } from '../../blocks/blockTypes';
import { moduleCall, PYTHON_MODULES } from '../moduleCall';
import type { StatementGenerator } from '../types';

export const moveStatementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.move.pair](_block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'pair');
  },
};
