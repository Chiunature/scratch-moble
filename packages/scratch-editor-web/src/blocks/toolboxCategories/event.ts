import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';

export const eventToolboxCategory = {
  kind: 'category',
  id: 'event',
  name: '事件',
  categorystyle: 'event_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('event'),
  },
  contents: [{ kind: 'block', type: BLOCK_TYPES.event.whenFlagClicked }],
} as const;
