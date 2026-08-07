import { BLOCK_TYPES } from '../blockTypes';
import { buildToolboxCategory } from './buildCategory';
import { integerKeyboardShadow, numberKeyboardShadow } from './shadowPresets';

export function controlToolboxCategory() {
  return buildToolboxCategory({
    id: 'control',
    categorystyle: 'control_category',
    contents: [
    {
      kind: 'block',
      type: BLOCK_TYPES.control.sleepS,
      inputs: {
        SECONDS: { shadow: numberKeyboardShadow(1) },
      },
    },
    // CONDITION 槽不设 shadow，保留空六角位供用户拖入布尔 reporter
    { kind: 'block', type: BLOCK_TYPES.control.wait },
    { kind: 'block', type: BLOCK_TYPES.control.break },
    {
      kind: 'block',
      type: BLOCK_TYPES.control.whileTimes,
      inputs: {
        TIMES: { shadow: integerKeyboardShadow(10) },
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
  });
}
