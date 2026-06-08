import { BLOCK_TYPES } from '../../blocks/blockTypes';
import {
  fieldStringToPython,
  fieldToPython,
  multiPortsInputToPythonArgs,
  valueToPython,
} from '../expressions';
import { moduleCall, PYTHON_MODULES } from '../moduleCall';
import type { StatementGenerator } from '../types';

export const moveStatementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.move.pair](block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'pair', [
      multiPortsInputToPythonArgs(block, 'PORTS', '0,1'),
      fieldToPython(block, 'DIRECTION', '0'),
    ]);
  },
  [BLOCK_TYPES.move.moveSetStopModule](block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'move_set_stop_module', [
      fieldToPython(block, 'MODE', '1'),
    ]);
  },
  [BLOCK_TYPES.move.movDirPowerSeconds](block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'mov_dir_power_seconds', [
      fieldStringToPython(block, 'DIRECTION', 'advance'),
      valueToPython(block, 'POWER', '50'),
      valueToPython(block, 'SECONDS', '1'),
    ]);
  },
  [BLOCK_TYPES.move.movDirPower](block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'mov_dir_power', [
      fieldStringToPython(block, 'DIRECTION', 'advance'),
      valueToPython(block, 'POWER', '50'),
    ]);
  },
  [BLOCK_TYPES.move.movStop](_block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'mov_stop');
  },
  [BLOCK_TYPES.move.movForPowerSeconds](block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'mov_for_power_seconds', [
      valueToPython(block, 'LEFT_POWER', '50'),
      valueToPython(block, 'RIGHT_POWER', '50'),
      valueToPython(block, 'SECONDS', '1'),
    ]);
  },
  [BLOCK_TYPES.move.movPower](block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'mov_power', [
      valueToPython(block, 'LEFT_POWER', '50'),
      valueToPython(block, 'RIGHT_POWER', '50'),
    ]);
  },
  [BLOCK_TYPES.move.movFindLineInit](block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'mov_find_line_init');
  },
  [BLOCK_TYPES.move.movFindLineRun](block, context) {
    return moduleCall(context, PYTHON_MODULES.move, 'mov_find_line_run', [
      valueToPython(block, 'LEFT_SENSOR', '0'),
      valueToPython(block, 'RIGHT_SENSOR', '1'),
      valueToPython(block, 'LEFT_POWER', '50'),
      valueToPython(block, 'RIGHT_POWER', '50'),
      valueToPython(block, 'KP', '0.1'),
      valueToPython(block, 'KD', '0.6'),
    ]);
  },
};
