import { BLOCK_TYPES } from '../../../blocks/blockTypes';
import { moduleCall, PYTHON_MODULES } from '../../moduleCall';
import type { StatementGenerator } from '../../types';
import { valueToPython, multiPortsInputToPythonArgs } from '../../expressions';
export const graySensorStatementGenerators: Record<string, StatementGenerator> =
  {
    [BLOCK_TYPES.sensor.gray_sensor.setColorThresholdValue](block, context) {
      return moduleCall(
        context,
        PYTHON_MODULES.sensor.gray_sensor,
        'set_color_threshold_value',
        [
          valueToPython(block, 'PORTS', '1'),
          valueToPython(block, 'VALUE', '1000'),
        ],
      );
    },
    [BLOCK_TYPES.sensor.gray_sensor.oneCalibrate](block, context) {
      return moduleCall(
        context,
        PYTHON_MODULES.sensor.gray_sensor,
        'one_calibrate',
        [
          valueToPython(block, 'PORTS', '1'),
          valueToPython(block, 'SECONDS', '1'),
        ],
      );
    },
    [BLOCK_TYPES.sensor.gray_sensor.twoCalibrate](block, context) {
      return moduleCall(
        context,
        PYTHON_MODULES.sensor.gray_sensor,
        'two_calibrate',
        [
          multiPortsInputToPythonArgs(block, 'PORTS', '0,1'),
          valueToPython(block, 'SECONDS', '1'),
        ],
      );
    },
  };
