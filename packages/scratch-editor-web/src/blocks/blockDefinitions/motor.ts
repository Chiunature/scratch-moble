import { BLOCK_TYPES } from '../blockTypes';
import motoricon from '../../../assets/block/block_motor_sensing.svg';
import separatorVertical from '../../../assets/block/block_separator_vertical.svg';

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
    // %1~%2 图与竖线；%3 PORTS 值槽：默认阴影为通用 port_dropdown（槽内 0-7 下拉），可拔掉换其它 Number 积木
    message0: '%1 %2 电机 %3 以 %4 功率转动 %5 秒',
    args0: [
      {
        type: 'field_image',
        src: motoricon,
        width: 24,
        height: 24,
        alt: '*',
      },
      {
        type: 'field_image',
        src: separatorVertical,
        width: 2,
        height: 30,
        alt: '',
      },
      { type: 'input_value', name: 'PORTS', check: 'Number' },
      { type: 'input_value', name: 'POWER', check: 'Number' },
      { type: 'input_value', name: 'SECONDS', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    inputsInline: true,
    style: 'motion_blocks',
  },
  {
    type: BLOCK_TYPES.motor.runPower,
    message0: '%1 %2 电机 %3 以 %4 功率转动',
    args0: [
      {
        type: 'field_image',
        src: motoricon,
        width: 24,
        height: 24,
        alt: '*',
      },
      {
        type: 'field_image',
        src: separatorVertical,
        width: 2,
        height: 30,
        alt: '',
      },
      { type: 'input_value', name: 'PORTS', check: 'Number' },
      { type: 'input_value', name: 'POWER', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    inputsInline: true,
    style: 'motion_blocks',
  },
  {
    type: BLOCK_TYPES.motor.stop,
    message0: '%1 %2 电机 %3 关闭电机',
    args0: [
      { type: 'field_image', src: motoricon, width: 24, height: 24, alt: '*' },
      {
        type: 'field_image',
        src: separatorVertical,
        width: 2,
        height: 30,
        alt: '',
      },
      { type: 'input_value', name: 'PORTS', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'motion_blocks',
  },
  {
    type: BLOCK_TYPES.motor.stopModule,
    message0: '%1 %2 电机 %3 将电机设置为停止时 %4',
    args0: [
      { type: 'field_image', src: motoricon, width: 24, height: 24, alt: '*' },
      {
        type: 'field_image',
        src: separatorVertical,
        width: 2,
        height: 30,
        alt: '',
      },
      { type: 'input_value', name: 'PORTS', check: 'Number' },
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: [
          ['惯性滑行', '0'],
          ['制动', '1'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    inputsInline: true,
    style: 'motion_blocks',
  },
] as const;
