import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';
import { noteShadow, positiveKeyboardShadow } from './shadowPresets';

export const soundToolboxCategory = {
  kind: 'category',
  id: 'sound',
  name: '声音',
  categorystyle: 'sound_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('sound'),
  },
  contents: [{ kind: 'block', type: BLOCK_TYPES.sound.playMusic,
    inputs: {
      NOTE: { shadow: noteShadow(12) },
      DURATION: { shadow: positiveKeyboardShadow(1) },
    },
  }],
} as const;
