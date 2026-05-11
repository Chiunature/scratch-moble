import { BLOCK_TYPES } from '../blockTypes';

export const eventBlockDefinitions = [
  {
    type: BLOCK_TYPES.event.whenFlagClicked,
    message0: '当开始运行',
    nextStatement: null,
    style: 'event_blocks',
    extensions: ['shape_hat'],
  },
] as const;
