import { BLOCK_TYPES } from '../../blocks/blockTypes';
import { valueToPython } from '../expressions';
import { indent } from '../helpers';
import { moduleCall, PYTHON_MODULES } from '../moduleCall';
import type { StatementGenerator } from '../types';
import type { NestedStatementsFn } from './types';

export function createControlStatementGenerators(
  nestedStatementsToPython: NestedStatementsFn,
): Record<string, StatementGenerator> {
  return {
    [BLOCK_TYPES.control.sleepS](block, context) {
      return moduleCall(context, PYTHON_MODULES.control, 'sleep_s', [
        valueToPython(block, 'SECONDS', '1'),
      ]);
    },

    [BLOCK_TYPES.control.wait](block, context) {
      const cond = valueToPython(block, 'CONDITION', 'False');
      return `${indent(context)}while not (${cond}):\n${indent({ indent: context.indent + 1 })}pass`;
    },

    [BLOCK_TYPES.control.break](_block, context) {
      return `${indent(context)}break`;
    },

    [BLOCK_TYPES.control.whileTimes](block, context) {
      const times = valueToPython(block, 'TIMES', '10');
      const body = nestedStatementsToPython(block, 'SUBSTACK', context);
      return `${indent(context)}for _ in range(int(${times})):\n${body}`;
    },
  };
}
