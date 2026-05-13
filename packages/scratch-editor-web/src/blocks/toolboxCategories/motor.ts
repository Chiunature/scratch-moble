import { BLOCK_TYPES } from '../blockTypes';
import { toolboxCategoryIconClasses } from './shared';

/**
 * 电机类 toolbox 项：
 * - inputs 与 blockDefinitions/motor.ts 中 input_value 的 name 一致。
 * - PORTS 使用通用 port_dropdown 阴影：槽内可下拉 0-7，也可拔掉换变量/运算等 Number 积木。
 */
export const motorToolboxCategory = {
  kind: 'category',
  id: 'motor',
  name: '电机',
  categorystyle: 'motor_category',
  cssconfig: {
    icon: toolboxCategoryIconClasses('motor'),
  },
  contents: [
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.runForPowerSeconds,
      inputs: {
        PORTS: {
          shadow: {
            type: BLOCK_TYPES.common.portDropdown,
            fields: { PORT: '0' },
          },
        },
        POWER: {
          shadow: {
            type: 'math_positive_number',
            fields: { NUM: 50 },
          },
        },
        SECONDS: {
          shadow: {
            type: 'math_positive_number',
            fields: { NUM: 2 },
          },
        },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.runPower,
      inputs: {
        PORTS: {
          shadow: {
            type: BLOCK_TYPES.common.portDropdown,
            fields: { PORT: '0' },
          },
        },
        POWER: {
          shadow: {
            type: 'math_positive_number',
            fields: { NUM: 50 },
          },
        },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.stop,
      inputs: {
        PORTS: {
          shadow: {
            type: BLOCK_TYPES.common.portDropdown,
            fields: { PORT: '0' },
          },
        },
      },
    },
    {
      kind: 'block',
      type: BLOCK_TYPES.motor.stopModule,
      inputs: {
        PORTS: {
          shadow: {
            type: BLOCK_TYPES.common.portDropdown,
            fields: { PORT: '0' },
          },
        },
        BLOCK: {
          shadow: {
            type: 'math_whole_number',
            fields: { NUM: 0 },
          },
        },
      },
    },
  ],
} as const;
