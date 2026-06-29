import { BLOCK_TYPES } from '../blockTypes';
import { buildToolboxCategory } from './buildCategory';
import { noteShadow, numberKeyboardShadow } from './shadowPresets';

export function soundToolboxCategory() {
  return buildToolboxCategory({
    id: 'sound',
    categorystyle: 'sound_category',
    contents: [
    {
      kind: 'block',
      type: BLOCK_TYPES.sound.playMusic,
      inputs: {
        NOTE: { shadow: noteShadow(12) },
        DURATION: { shadow: numberKeyboardShadow(0.25) },
      },
    },
  ],
  });
}
