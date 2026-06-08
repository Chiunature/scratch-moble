import { BLOCK_TYPES } from '../../blocks/blockTypes';
import { line } from '../helpers';
import type { StatementGenerator } from '../types';

export const eventStatementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.event.whenFlagClicked](_block, context) {
    return line(context, '# 当开始运行');
  },
};
