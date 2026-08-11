import { BLOCK_TYPES } from '../../../blocks/blockTypes';
import { moduleCall, PYTHON_MODULES } from '../../moduleCall';
import type { StatementGenerator } from '../../types';
export const otherSensor: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.sensor.other.resetTimer](block, context) {
    return moduleCall(context, PYTHON_MODULES.control, 'resetTimer');
  },
};
