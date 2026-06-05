import { matrixLightRowsToPythonArgs } from '@scratch-mobile/shared';

import { BLOCK_TYPES } from '../../blocks/blockTypes';
import { getFieldValue } from '../helpers';
import { moduleCall, PYTHON_MODULES } from '../moduleCall';
import type { StatementGenerator } from '../types';

export const matrixLightStatementGenerators: Record<string, StatementGenerator> = {
  [BLOCK_TYPES.matrixLight.show](block, context) {
    const matrix = getFieldValue(block, 'MATRIX') ?? '1F,1F,1F,1F,1F,1F,1F';
    return moduleCall(context, PYTHON_MODULES.matrix, 'show', [
      matrixLightRowsToPythonArgs(matrix),
    ]);
  },
};
