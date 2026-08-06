import { BLOCK_TYPES } from '../blockTypes';
import {
  integerSliderShadow,
  motorPortShadowMulti,
  numberKeyboardShadow,
} from './shadowPresets';
import { buildToolboxCategory } from './buildCategory';

export function moveToolboxCategory() {
  return buildToolboxCategory({
    id: 'move',
    categorystyle: 'move_category',
    contents: [
    {
      kind: 'block',
      type: BLOCK_TYPES.move.pair,
      inputs: {
        PORTS: { shadow: motorPortShadowMulti(['4', '5']) },
      },
      fields: {
        DIRECTION: '3',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.moveSetStopModule,
      fields: {
        MODE: '1',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.movDirPowerSeconds,
      inputs: {
        POWER: { shadow: integerSliderShadow(50) },
        SECONDS: { shadow: numberKeyboardShadow(1) },
      },
      fields: {
        DIRECTION: 'advance',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.movDirPower,
      inputs: {
        POWER: { shadow: integerSliderShadow(50) },
      },
      fields: {
        DIRECTION: 'advance',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.movStop,
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.movForPowerSeconds,
      inputs: {
        LEFT_POWER: { shadow: integerSliderShadow(50) },
        RIGHT_POWER: { shadow: integerSliderShadow(50) },
        SECONDS: { shadow: numberKeyboardShadow(1) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.movPower,
      inputs: {
        LEFT_POWER: { shadow: integerSliderShadow(50) },
        RIGHT_POWER: { shadow: integerSliderShadow(50) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.movFindLineInit,
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.movFindLineRun,
      inputs: {
        LEFT_SENSOR: { shadow: numberKeyboardShadow(0) },
        RIGHT_SENSOR: { shadow: numberKeyboardShadow(0) },
        LEFT_POWER: { shadow: integerSliderShadow(80) },
        RIGHT_POWER: { shadow: integerSliderShadow(80) },
        KP: { shadow: numberKeyboardShadow(0.1) },
        KD: { shadow: numberKeyboardShadow(0.6) },
      },
    },
  ],
  });
}
