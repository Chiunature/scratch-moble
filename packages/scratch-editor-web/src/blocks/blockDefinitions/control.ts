import { BLOCK_TYPES } from '../blockTypes';

export const controlBlockDefinitions = [
  {
    type: BLOCK_TYPES.control.sleepSeconds,
    message0: '等待 %1 秒',
    args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    style: 'loop_blocks',
  },
] as const;
