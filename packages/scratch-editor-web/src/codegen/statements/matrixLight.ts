import { matrixLightRowsToPythonArgs } from '@scratch-mobile/shared';

import { BLOCK_TYPES } from '../../blocks/blockTypes';
import { fieldToPython, valueToPython } from '../expressions';
import { quotePythonString } from '../helpers';
import { moduleCall, PYTHON_MODULES } from '../moduleCall';
import type { StatementGenerator } from '../types';

export const matrixLightStatementGenerators: Record<
  string,
  StatementGenerator
> = {
  [BLOCK_TYPES.matrixLight.show](block, context) {
    const matrix = fieldToPython(block, 'MATRIX', '1F,1F,1F,1F,1F,1F,1F');
    return moduleCall(context, PYTHON_MODULES.matrix, 'show', [
      matrixLightRowsToPythonArgs(matrix),
    ]);
  },
  [BLOCK_TYPES.matrixLight.clear](_block, context) {
    return moduleCall(context, PYTHON_MODULES.matrix, 'clear');
  },
  [BLOCK_TYPES.matrixLight.setBrightness](block, context) {
    return moduleCall(context, PYTHON_MODULES.matrix, 'set_brightness', [
      fieldToPython(block, 'BRIGHTNESS', '0'),
    ]);
  },
  [BLOCK_TYPES.matrixLight.showRoll](block, context) {
    const text = valueToPython(block, 'TEXT', quotePythonString('ABCD'));
    return moduleCall(context, PYTHON_MODULES.matrix, 'show_roll', [
      `str(${text})`,
    ]);
  },
  [BLOCK_TYPES.matrixLight.setPixelBrightness](block, context) {
    return moduleCall(context, PYTHON_MODULES.matrix, 'set_pixel_brightness', [
      valueToPython(block, 'X', '0'),
      valueToPython(block, 'Y', '0'),
      fieldToPython(block, 'OPEN', '0'),
    ]);
  },
};
