import { BLOCK_TYPES } from '../../blocks/blockTypes';
import { noteValueToPython, valueToPython } from '../expressions';
import { moduleCall, PYTHON_MODULES } from '../moduleCall';
import type { StatementGenerator } from '../types';

export const soundStatementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.sound.playMusic](block, context) {
    return moduleCall(context, PYTHON_MODULES.sound, 'play_muic', [
      noteValueToPython(block, 'NOTE', 12),
      valueToPython(block, 'DURATION', '1'),
    ]);
  },
};
