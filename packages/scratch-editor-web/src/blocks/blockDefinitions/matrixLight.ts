import { BLOCK_TYPES } from '../blockTypes';

export const matrixLightBlockDefinitions = [
  {
    type: BLOCK_TYPES.matrixLight.show,
    message0: '矩阵灯 %1',
    args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    style: 'looks_blocks',
  },
] as const;
