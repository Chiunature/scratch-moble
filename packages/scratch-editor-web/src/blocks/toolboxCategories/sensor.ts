import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';

export const sensorToolboxCategory = {
  kind: 'category',
  id: 'sensor',
  name: '传感器',
  categorystyle: 'sensor_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('sensor'),
  },
  contents: [
    { kind: 'block', type: BLOCK_TYPES.sensor.touch_sensor.oneCalibrate },
    { kind: 'block', type: BLOCK_TYPES.sensor.ultrasion_sensor.value },
  ],
} as const;
