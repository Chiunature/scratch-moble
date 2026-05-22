import { BLOCK_TYPES } from '../blockTypes';
import combinedMotor from '../../../assets/toolbox/combined_motor.svg';
import separatorVertical from '../../../assets/block/block_separator_vertical.svg';
export const moveBlockDefinitions = [
  {
    type: BLOCK_TYPES.move.pair,
    message0: '%1 %2将组合电机设置为 %3 转动方向为 %4',
    args0: [
      {
        type: 'field_image',
        src: combinedMotor,
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
      {
        type: 'field_dropdown',
        name: 'DIRECTION',
        options: [
          ['正转', '0'],
          ['反转', '1'],
        ],
      },
    ],

    previousStatement: null,
    nextStatement: null,
    style: 'motion_blocks',
  },
] as const;
