import { BLOCK_TYPES } from '../blockTypes';

export const soundBlockDefinitions = [
  {
    type: BLOCK_TYPES.sound.playMusic,
    message0: '播放音乐',
    previousStatement: null,
    nextStatement: null,
    style: 'looks_blocks',
  },
] as const;
