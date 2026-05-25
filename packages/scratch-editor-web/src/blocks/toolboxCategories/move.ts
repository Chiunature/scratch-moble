import { BLOCK_TYPES } from '../blockTypes';
import {
  portShadowMulti,
  integerSliderShadow,
  positiveKeyboardShadow,
} from './shadowPresets';
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
        DIRECTION: '3',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.moveSetStopModule,
      fields: {
        DIRECTION: '1',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.move.movDirPowerSeconds,
      inputs: {
        POWER: { shadow: integerSliderShadow(50) },
        SECONDS: { shadow: positiveKeyboardShadow(1) },
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
        SECONDS: { shadow: positiveKeyboardShadow(1) },
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
        LEFT_SENSOR: { shadow: positiveKeyboardShadow(50) },
        RIGHT_SENSOR: { shadow: positiveKeyboardShadow(50) },
        LEFT_POWER: { shadow: integerSliderShadow(50) },
        RIGHT_POWER: { shadow: integerSliderShadow(50) },
        KP: { shadow: positiveKeyboardShadow(0.1) },
        KD: { shadow: positiveKeyboardShadow(0.6) },
      },
    },
  ],
} as const;
