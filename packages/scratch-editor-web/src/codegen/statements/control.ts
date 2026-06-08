import { BLOCK_TYPES } from '../../blocks/blockTypes';
import { valueToPython } from '../expressions';
import { childContext, joinLines, line } from '../helpers';
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
      const inner = childContext(context);
      return joinLines(
        line(context, `while not (${cond}):`),
        line(inner, '_os.sleep_s(0.001)'),
      );
    },

    [BLOCK_TYPES.control.break](_block, context) {
      return line(context, 'break');
    },

    [BLOCK_TYPES.control.whileTimes](block, context) {
      const times = valueToPython(block, 'TIMES', '10');
      const body = nestedStatementsToPython(block, 'SUBSTACK', context);
      const inner = childContext(context);
      return joinLines(
        line(context, `for count in range(${times}):`),
        body,
        line(inner, '_os.sleep_s(0.001)'),
      );
    },

    [BLOCK_TYPES.control.while](block, context) {
      const body = nestedStatementsToPython(block, 'SUBSTACK', context);
      const inner = childContext(context);
      return joinLines(
        line(context, 'while True:'),
        body,
        line(inner, '_os.sleep_s(0.001)'),
      );
    },

    [BLOCK_TYPES.control.if](block, context) {
      const cond = valueToPython(block, 'CONDITION', 'False');
      const body = nestedStatementsToPython(block, 'SUBSTACK', context);
      return joinLines(line(context, `if ${cond}:`), body);
    },
    [BLOCK_TYPES.control.ifElse](block, context) {
      const cond = valueToPython(block, 'CONDITION', 'False');
      const body = nestedStatementsToPython(block, 'SUBSTACK', context);
      const body2 = nestedStatementsToPython(block, 'SUBSTACK2', context);
      return joinLines(
        line(context, `if ${cond}:`),
        body,
        line(context, `else:`),
        body2,
      );
    },
    [BLOCK_TYPES.control.whileDo](block, context) {
      const cond = valueToPython(block, 'CONDITION', 'False');
      const body = nestedStatementsToPython(block, 'SUBSTACK', context);
      const inner = childContext(context); // 子层
      return joinLines(
        line(context, `while not (${cond}):`),
        body,
        line(inner, '_os.sleep_s(0.001)'),
      );
    },
    [BLOCK_TYPES.control.stopExit](_block, context) {
      return moduleCall(context, PYTHON_MODULES.control, 'stop_exit');
    },
  };
}
