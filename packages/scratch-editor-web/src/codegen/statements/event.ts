import { BLOCK_TYPES } from '../../blocks/blockTypes';
import { indent } from '../helpers';
import type { StatementGenerator } from '../types';

export const eventStatementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.event.whenFlagClicked](_block, context) {
    return `${indent(context)}# 当开始运行`;
  },
};
