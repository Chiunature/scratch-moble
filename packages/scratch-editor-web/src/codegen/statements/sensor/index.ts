import type { StatementGenerator } from '../../types';
import { graySensorStatementGenerators } from './graySensor';
import { remoteControlSensor } from './remoteControlSensor';
import { otherSensor } from './otherSensor';

export const sensorStatementGenerators: Record<string, StatementGenerator> = {
  ...graySensorStatementGenerators,
  ...remoteControlSensor,
  ...otherSensor,
  // touch_sensor / ultrasonic_sensor / remote_control_sensor / other 按子类追加
};
