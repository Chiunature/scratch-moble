import { BLOCK_TYPES } from '../blockTypes';
import { buildToolboxCategory } from './buildCategory';

export function eventToolboxCategory() {
  return buildToolboxCategory({
    id: 'event',
    categorystyle: 'event_category',
    contents: [{ kind: 'block', type: BLOCK_TYPES.event.whenFlagClicked }],
  });
}
