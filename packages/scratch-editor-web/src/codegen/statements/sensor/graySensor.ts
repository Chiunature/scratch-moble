import { BLOCK_TYPES } from '../../../blocks/blockTypes';
import { moduleCall, PYTHON_MODULES } from '../../moduleCall';
import type { StatementGenerator } from '../../types';

export const graySensorStatementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.sensor.gray_sensor.oneCalibrate](_block, context) {
    return moduleCall(
      context,
      PYTHON_MODULES.sensor.gray_sensor,
      'one_calibrate',
    );
  },
};
