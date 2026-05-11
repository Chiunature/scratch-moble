import { BLOCK_TYPES } from '../blockTypes';

export const moveBlockDefinitions = [
  {
    type: BLOCK_TYPES.move.pair,
    message0: '移动 配对',
    previousStatement: null,
    nextStatement: null,
    style: 'motion_blocks',
  },
] as const;
