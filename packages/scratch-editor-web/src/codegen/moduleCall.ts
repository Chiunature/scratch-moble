import { line } from './helpers';
import type { GenerateContext } from './types';

/**
 * 固件 API 模块前缀，结构与 blocks/blockTypes.ts 对齐。
 * - 无子类：直接字符串，如 motor → `_motor`
 * - 有子类：嵌套对象，如 sensor.gray_sensor → `_gray_sensor`
 */
export const PYTHON_MODULES = {
  motor: '_motor',
  move: '_motor',
  matrix: '_matrix',
  sound: '_sound',
  control: '_os',
  sensor: {
    touch_sensor: '_touch',
    gray_sensor: '_color',
    ultrasonic_sensor: '_ultrasion',
    remote_control_sensor: '_remote_control_sensor',
    other: '_key',
  },
} as const;

export type ModuleCallArg = string | readonly string[];

function flattenModuleCallArgs(args: readonly ModuleCallArg[]): string[] {
  return args.flatMap(arg => (typeof arg === 'string' ? [arg] : [...arg]));
}

/** 嵌在输入槽里的模块调用（无行首缩进），如布尔 reporter */
export function moduleExpression(
  module: string,
  method: string,
  args: readonly ModuleCallArg[] = [],
): string {
  const flatArgs = flattenModuleCallArgs(args);
  return `${module}.${method}(${flatArgs.join(', ')})`;
}

export function moduleCall(
  context: GenerateContext,
  module: string,
  method: string,
  args: readonly ModuleCallArg[] = [],
): string {
  return line(context, moduleExpression(module, method, args));
}
