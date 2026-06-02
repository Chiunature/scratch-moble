import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';
import {
  portShadow,
  positiveKeyboardShadow,
  portShadowMulti,
} from './shadowPresets';

export const sensorToolboxCategory = {
  kind: 'category',
  id: 'sensor',
  name: '传感器',
  categorystyle: 'sensor_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('sensor'),
  },
  contents: [
    { kind: 'label', text: '触碰传感器' },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.touch_sensor.state,
      inputs: { PORTS: { shadow: portShadow('0') } },
    },
    { kind: 'label', text: '灰度传感器' },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.gray_sensor.lux,
      inputs: { PORTS: { shadow: portShadow('0') } },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.gray_sensor.cmpLux,
      inputs: {
        PORTS: { shadow: portShadow('0') },
        VALUE: { shadow: positiveKeyboardShadow(50) },
      },
      fields: {
        CMP: '=',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.gray_sensor.setColorThresholdValue,
      inputs: {
        PORTS: { shadow: portShadow('0') },
        VALUE: { shadow: positiveKeyboardShadow(1000) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.gray_sensor.luxState,
      inputs: {
        PORTS: { shadow: portShadow('0') },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.gray_sensor.oneCalibrate,
      inputs: {
        PORTS: { shadow: portShadow('0') },
        SECONDS: { shadow: positiveKeyboardShadow(1) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.gray_sensor.twoCalibrate,
      inputs: {
        PORTS: { shadow: portShadowMulti(['0', '1']) },
        SECONDS: { shadow: positiveKeyboardShadow(1) },
      },
    },
    { kind: 'label', text: '超声波传感器' },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.ultrasonic_sensor.cmpValue,
      inputs: {
        PORTS: { shadow: portShadow('0') },
        VALUE: { shadow: positiveKeyboardShadow(100) },
      },
      fields: {
        CMP: '=',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.ultrasonic_sensor.value,
      inputs: {
        PORTS: { shadow: portShadow('0') },
      },
    },
    { kind: 'label', text: '遥控器' },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.clicker_sensor.keyRemote,
      inputs: {
        PORTS: { shadow: portShadow('0') },
      },
      fields: {
        STATE: '=',
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.clicker_sensor.left,
      inputs: {
        LEFT_OFFSET: { shadow: positiveKeyboardShadow(0) },
        RIGHT_OFFSET: { shadow: positiveKeyboardShadow(0) },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.sensor.clicker_sensor.right,
      inputs: {
        LEFT_OFFSET: { shadow: positiveKeyboardShadow(0) },
        RIGHT_OFFSET: { shadow: positiveKeyboardShadow(0) },
      },
    },
  ],
} as const;
