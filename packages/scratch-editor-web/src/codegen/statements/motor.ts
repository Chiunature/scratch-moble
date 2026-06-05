import { BLOCK_TYPES } from '../../blocks/blockTypes';
import { moduleCall, PYTHON_MODULES } from '../moduleCall';
import { fieldToPython, valueToPython } from '../expressions';
import type { StatementGenerator } from '../types';

export const motorStatementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.motor.runForPowerSeconds](block, context) {
    return moduleCall(context, PYTHON_MODULES.motor, 'run_for_power_seconds', [
      valueToPython(block, 'PORTS', '1'),
      valueToPython(block, 'POWER', '50'),
      valueToPython(block, 'SECONDS', '2'),
    ]);
  },

  [BLOCK_TYPES.motor.runPower](block, context) {
    return moduleCall(context, PYTHON_MODULES.motor, 'run_power', [
      valueToPython(block, 'PORTS', '1'),
      valueToPython(block, 'POWER', '50'),
    ]);
  },

  [BLOCK_TYPES.motor.stop](block, context) {
    return moduleCall(context, PYTHON_MODULES.motor, 'stop', [
      valueToPython(block, 'PORTS', '1'),
    ]);
  },

  [BLOCK_TYPES.motor.stopModule](block, context) {
    return moduleCall(context, PYTHON_MODULES.motor, 'stop_module', [
      valueToPython(block, 'PORTS', '1'),
      fieldToPython(block, 'MODE', '0'),
    ]);
  },
};
