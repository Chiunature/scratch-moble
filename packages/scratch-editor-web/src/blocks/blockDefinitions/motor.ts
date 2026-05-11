import { BLOCK_TYPES } from '../blockTypes';

/** 电机分类积木 JSON（与 toolbox 中引用的 type 一致）
 * type：积木字段名
 * message0：积木显示文本
 * args0：积木参数
 * previousStatement：前一个语句
 * nextStatement：下一个语句
 * style：积木样式
 */
export const motorBlockDefinitions = [
  {
    type: BLOCK_TYPES.motor.runForPowerSeconds,
    message0: '电机按功率运行 %1',
    args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    style: 'motion_blocks',
  },
] as const;
