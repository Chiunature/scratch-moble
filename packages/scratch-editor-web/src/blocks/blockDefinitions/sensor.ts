import { BLOCK_TYPES } from '../blockTypes';

export const sensorBlockDefinitions = [
  {
    type: BLOCK_TYPES.sensor.touch_sensor.oneCalibrate,
    message0: '传感器 单次校准',
    previousStatement: null,
    nextStatement: null,
    style: 'looks_blocks',
  },
  {
    type: BLOCK_TYPES.sensor.ultrasion_sensor.value,
    message0: '超声波传感器 数值',
    output: 'Number',
    outputShape: 2, //2：圆角，1：六角，3：矩形
    style: 'sensor_blocks',
  },
] as const;
