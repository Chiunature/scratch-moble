import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';

export const soundToolboxCategory = {
  kind: 'category',
  id: 'sound',
  name: '声音',
  categorystyle: 'sound_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('sound'),
  },
  contents: [{ kind: 'block', type: BLOCK_TYPES.sound.playMusic }],
} as const;
