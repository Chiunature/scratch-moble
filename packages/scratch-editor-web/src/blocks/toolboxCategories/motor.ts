import { BLOCK_TYPES } from '../blockTypes';
import {
  decimalSliderShadow,
  integerSliderShadow,
  portShadow,
  positiveKeyboardShadow,
} from './shadowPresets';
import { toolboxCategoryIconClasses } from './shared';

/** inputs 名称与 blockDefinitions/motor.ts 中 input_value 一致；阴影见 shadowPresets.ts */
export const motorToolboxCategory = {
  kind: 'category',
  id: 'motor',
  name: '电机',
  categorystyle: 'motor_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('motor'),
  },
  contents: [
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.runForPowerSeconds,
      inputs: {
        PORTS: { shadow: portShadow('0') },
        POWER: { shadow: integerSliderShadow(50) },
        SECONDS: { shadow: positiveKeyboardShadow(2) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.runPower,
      inputs: {
        PORTS: { shadow: portShadow('0') },
        POWER: { shadow: positiveKeyboardShadow(50) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.stop,
      inputs: {
        PORTS: { shadow: portShadow('0') },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.stopModule,
      inputs: {
        PORTS: { shadow: portShadow('0') },
      },
      fields: { BLOCK: '0' },
    },
  ],
} as const;
