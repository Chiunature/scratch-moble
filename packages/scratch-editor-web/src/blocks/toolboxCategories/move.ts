import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';

export const moveToolboxCategory = {
  kind: 'category',
  id: 'move',
  name: '移动',
  categorystyle: 'move_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('move'),
  },
  contents: [{ kind: 'block', type: BLOCK_TYPES.move.pair }],
} as const;
