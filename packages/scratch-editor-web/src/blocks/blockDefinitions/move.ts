import { BLOCK_TYPES } from '../blockTypes';
import combinedMotor from '../../../assets/block/block_combined_motor.svg';
import separatorVertical from '../../../assets/block/block_separator_vertical.svg';
import leftIcon from '../../../assets/block/left.svg';
import rightIcon from '../../../assets/block/right.svg';
import forwardIcon from '../../../assets/block/forward.svg';
import backwardIcon from '../../../assets/block/backward.svg';
import { blockMsg, blockOpt, dropdownOpt } from './blockI18n';

function moveDirectionOptions() {
  return [
    [
      {
        src: forwardIcon,
        width: 24,
        height: 24,
        alt: blockOpt('moveDirection.advance'),
      },
      'advance',
    ],
    [
      {
        src: backwardIcon,
        width: 24,
        height: 24,
        alt: blockOpt('moveDirection.retreat'),
      },
      'retreat',
    ],
    [
      {
        src: leftIcon,
        width: 24,
        height: 24,
        alt: blockOpt('moveDirection.left'),
      },
      'left',
    ],
    [
      {
        src: rightIcon,
        width: 24,
        height: 24,
        alt: blockOpt('moveDirection.right'),
      },
      'right',
    ],
  ];
}

export function getMoveBlockDefinitions() {
  return [
    {
      type: BLOCK_TYPES.move.pair,
      message0: blockMsg('move.pair'),
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
            dropdownOpt('pairDirection.leftReverse', '0'),
            dropdownOpt('pairDirection.rightReverse', '1'),
            dropdownOpt('pairDirection.allReverse', '2'),
            dropdownOpt('pairDirection.allForward', '3'),
          ],
        },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'move_blocks',
    },
    {
      type: BLOCK_TYPES.move.moveSetStopModule,
      message0: blockMsg('move.moveSetStopModule'),
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
        {
          type: 'field_dropdown',
          name: 'MODE',
          options: [
            dropdownOpt('motorStopMode.coast', '0'),
            dropdownOpt('motorStopMode.brake', '1'),
          ],
        },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'move_blocks',
    },
    {
      type: BLOCK_TYPES.move.movDirPowerSeconds,
      message0: blockMsg('move.movDirPowerSeconds'),
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
        {
          type: 'field_dropdown',
          name: 'DIRECTION',
          options: moveDirectionOptions(),
        },
        { type: 'input_value', name: 'POWER', check: 'Number' },
        { type: 'input_value', name: 'SECONDS', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      style: 'move_blocks',
    },
    {
      type: BLOCK_TYPES.move.movDirPower,
      message0: blockMsg('move.movDirPower'),
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
        {
          type: 'field_dropdown',
          name: 'DIRECTION',
          options: moveDirectionOptions(),
        },
        { type: 'input_value', name: 'POWER', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      style: 'move_blocks',
    },
    {
      type: BLOCK_TYPES.move.movStop,
      message0: blockMsg('move.movStop'),
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
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      style: 'move_blocks',
    },
    {
      type: BLOCK_TYPES.move.movForPowerSeconds,
      message0: blockMsg('move.movForPowerSeconds'),
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
        {
          type: 'input_value',
          name: 'LEFT_POWER',
          check: 'Number',
        },
        { type: 'input_value', name: 'RIGHT_POWER', check: 'Number' },
        { type: 'input_value', name: 'SECONDS', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      style: 'move_blocks',
    },
    {
      type: BLOCK_TYPES.move.movPower,
      message0: blockMsg('move.movPower'),
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
        {
          type: 'input_value',
          name: 'LEFT_POWER',
          check: 'Number',
        },
        { type: 'input_value', name: 'RIGHT_POWER', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      style: 'move_blocks',
    },
    {
      type: BLOCK_TYPES.move.movFindLineInit,
      message0: blockMsg('move.movFindLineInit'),
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
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      style: 'move_blocks',
    },
    {
      type: BLOCK_TYPES.move.movFindLineRun,
      message0: blockMsg('move.movFindLineRun'),
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
        {
          type: 'input_value',
          name: 'LEFT_SENSOR',
          check: 'Number',
        },
        {
          type: 'input_value',
          name: 'RIGHT_SENSOR',
          check: 'Number',
        },
        {
          type: 'input_value',
          name: 'LEFT_POWER',
          check: 'Number',
        },
        { type: 'input_value', name: 'RIGHT_POWER', check: 'Number' },
        { type: 'input_value', name: 'KP', check: 'Number' },
        { type: 'input_value', name: 'KD', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      style: 'move_blocks',
    },
  ];
}
