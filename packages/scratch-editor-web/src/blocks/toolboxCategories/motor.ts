import { BLOCK_TYPES } from '../blockTypes';
import {
  integerSliderShadow,
  motorPortShadow,
  numberKeyboardShadow,
} from './shadowPresets';
import { buildToolboxCategory } from './buildCategory';

/** inputs 名称与 blockDefinitions/motor.ts 中 input_value 一致；阴影见 shadowPresets.ts */
export function motorToolboxCategory() {
  return buildToolboxCategory({
    id: 'motor',
    categorystyle: 'motor_category',
    contents: [
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.runForPowerSeconds,
      inputs: {
        PORTS: { shadow: motorPortShadow('4') },
        POWER: { shadow: integerSliderShadow(50) },
        SECONDS: { shadow: numberKeyboardShadow(2) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.runPower,
      inputs: {
        PORTS: { shadow: motorPortShadow('4') },
        POWER: { shadow: integerSliderShadow(50) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.stop,
      inputs: {
        PORTS: { shadow: motorPortShadow('4') },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.stopModule,
      inputs: {
        PORTS: { shadow: motorPortShadow('4') },
      },
      fields: { MODE: '0' },
    },
  ],
  });
}
