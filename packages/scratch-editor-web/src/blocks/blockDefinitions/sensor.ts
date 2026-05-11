import { BLOCK_TYPES } from '../blockTypes';

export const sensorBlockDefinitions = [
  {
    type: BLOCK_TYPES.sensor.oneCalibrate,
    message0: '传感器 单次校准',
    previousStatement: null,
    nextStatement: null,
    style: 'looks_blocks',
  },
] as const;
