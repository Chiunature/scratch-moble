import { indent } from './helpers';
import type { GenerateContext } from './types';

/**
 * 固件 API 模块前缀，结构与 blocks/blockTypes.ts 对齐。
 * - 无子类：直接字符串，如 motor → `_motor`
 * - 有子类：嵌套对象，如 sensor.gray_sensor → `_gray_sensor`
 */
export const PYTHON_MODULES = {
  motor: '_motor',
  move: '_move',
  matrix: '_matrix',
  sound: '_sound',
  control: '_control',
  sensor: {
    touch_sensor: '_touch_sensor',
    gray_sensor: '_gray_sensor',
    ultrasonic_sensor: '_ultrasonic_sensor',
    remote_control_sensor: '_remote_control_sensor',
    other: '_sensor_other',
  },
} as const;

export function moduleCall(
  context: GenerateContext,
  module: string,
  method: string,
  args: string[] = [],
): string {
  return `${indent(context)}${module}.${method}(${args.join(', ')})`;
}
