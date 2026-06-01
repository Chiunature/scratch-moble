import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';
import { positiveKeyboardShadow } from './shadowPresets';

export const controlToolboxCategory = {
  kind: 'category',
  id: 'control',
  name: '控制',
  categorystyle: 'control_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('control'),
  },
  contents: [
    {
      kind: 'block',
      type: BLOCK_TYPES.control.sleepS,
      inputs: {
        SECONDS: { shadow: positiveKeyboardShadow(1) },
      },
    },
    // CONDITION 槽不设 shadow，保留空六角位供用户拖入布尔 reporter
    { kind: 'block', type: BLOCK_TYPES.control.wait },
    { kind: 'block', type: BLOCK_TYPES.control.break },
    {
      kind: 'block',
      type: BLOCK_TYPES.control.whileTimes,
      inputs: {
        TIMES: { shadow: positiveKeyboardShadow(10) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.control.while
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.control.if,
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.control.ifElse,
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.control.whileDo,
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.control.stopExit,
    },
  ],
} as const;
