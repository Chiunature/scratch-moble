import type { StatementGenerator } from '../../types';
import { graySensorStatementGenerators } from './graySensor';

export const sensorStatementGenerators: Record<string, StatementGenerator> = {
  ...graySensorStatementGenerators,
  // touch_sensor / ultrasonic_sensor / remote_control_sensor / other 按子类追加
};
