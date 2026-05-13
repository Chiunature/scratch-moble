import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';

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
      type: BLOCK_TYPES.control.sleepSeconds,
      inputs: {
        STEPS: {
          shadow: {
            type: 'math_number',
            fields: { NUM: 15 },
          },
        },
      },
    },
  ],
} as const;
