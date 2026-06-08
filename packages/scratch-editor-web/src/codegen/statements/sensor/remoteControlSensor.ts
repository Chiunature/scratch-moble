import { BLOCK_TYPES } from '../../../blocks/blockTypes';
import { moduleCall, PYTHON_MODULES } from '../../moduleCall';
import type { StatementGenerator } from '../../types';
import { valueToPython, multiPortsInputToPythonArgs } from '../../expressions';
export const remoteControlSensor: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.sensor.remote_control_sensor.movSetAdvanceOffset](
    block,
    context,
  ) {
    return moduleCall(context, PYTHON_MODULES.motor, 'mov_set_advance_offset', [
      valueToPython(block, 'LEFT_OFFSET', '0'),
      valueToPython(block, 'RIGHT_OFFSET', '0'),
    ]);
  },
  [BLOCK_TYPES.sensor.remote_control_sensor.movSetRetreatOffset](
    block,
    context,
  ) {
    return moduleCall(context, PYTHON_MODULES.motor, 'mov_set_retreat_offset', [
      valueToPython(block, 'LEFT_OFFSET', '0'),
      valueToPython(block, 'RIGHT_OFFSET', '0'),
    ]);
  },
};
