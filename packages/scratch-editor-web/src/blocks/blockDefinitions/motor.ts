import { BLOCK_TYPES } from '../blockTypes';
import motoricon from '../../../assets/block/block_motor_sensing.svg';
import separatorVertical from '../../../assets/block/block_separator_vertical.svg';
import { blockMsg, dropdownOpt } from './blockI18n';

export function getMotorBlockDefinitions() {
  return [
    {
      type: BLOCK_TYPES.motor.runForPowerSeconds,
      message0: blockMsg('motor.runForPowerSeconds'),
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
      message0: blockMsg('motor.runPower'),
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
      message0: blockMsg('motor.stop'),
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
      message0: blockMsg('motor.stopModule'),
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
            dropdownOpt('motorStopMode.coast', '0'),
            dropdownOpt('motorStopMode.brake', '1'),
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      style: 'motion_blocks',
    },
  ];
}
