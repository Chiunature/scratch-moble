import { BLOCK_TYPES } from '../blockTypes';
import { portShadowMulti } from './shadowPresets';
import { toolboxCategoryIconClasses } from './shared';

export const moveToolboxCategory = {
  kind: 'category',
  id: 'move',
  name: '移动',
  categorystyle: 'move_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('move'),
  },
  contents: [
    {
      kind: 'block',
      type: BLOCK_TYPES.move.pair,
      inputs: {
        PORTS: { shadow: portShadowMulti(['0', '1']) },
      },
      fields: {
        DIRECTION: '0',
      },
    },
  ],
} as const;
