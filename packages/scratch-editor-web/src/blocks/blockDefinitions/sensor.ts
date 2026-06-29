import { BLOCK_TYPES } from '../blockTypes';
import touchIcon from '../../../assets/block/block_touch.svg';
import ultrasonicIcon from '../../../assets/block/block_ultrasonic.svg';
import distanceIcon from '../../../assets/block/block_gray_scale.svg';
import separatorVertical from '../../../assets/block/block_separator_vertical.svg';
import handleShankIcon from '../../../assets/block/block_handleShank.svg';
import { blockMsg, dropdownOpt } from './blockI18n';

const cmpOptions = () => [
  ['>', '>'],
  ['<', '<'],
  ['=', '='],
];

export function getSensorBlockDefinitions() {
  return [
    {
      type: BLOCK_TYPES.sensor.touch_sensor.state,
      message0: blockMsg('sensor.touchState'),
      args0: [
        {
          type: 'field_image',
          src: touchIcon,
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
      ],
      style: 'sensors_blocks',
      extensions: ['output_boolean'],
    },
    {
      type: BLOCK_TYPES.sensor.gray_sensor.cmpLux,
      message0: blockMsg('sensor.grayCmpLux'),
      args0: [
        {
          type: 'field_image',
          src: touchIcon,
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
          name: 'CMP',
          options: cmpOptions(),
        },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      style: 'sensors_blocks',
      extensions: ['output_boolean'],
    },
    {
      type: BLOCK_TYPES.sensor.gray_sensor.lux,
      message0: blockMsg('sensor.grayLux'),
      args0: [
        {
          type: 'field_image',
          src: distanceIcon,
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
      ],
      style: 'sensors_blocks',
      extensions: ['output_number'],
    },
    {
      type: BLOCK_TYPES.sensor.gray_sensor.setColorThresholdValue,
      message0: blockMsg('sensor.graySetThreshold'),
      args0: [
        {
          type: 'field_image',
          src: distanceIcon,
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
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      style: 'sensors_blocks',
      previousStatement: null,
      nextStatement: null,
      extensions: ['shape_statement'],
    },
    {
      type: BLOCK_TYPES.sensor.gray_sensor.luxState,
      message0: blockMsg('sensor.grayLuxState'),
      args0: [
        {
          type: 'field_image',
          src: distanceIcon,
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
      ],
      style: 'sensors_blocks',
      extensions: ['output_boolean'],
    },
    {
      type: BLOCK_TYPES.sensor.gray_sensor.oneCalibrate,
      message0: blockMsg('sensor.grayOneCalibrate'),
      args0: [
        {
          type: 'field_image',
          src: distanceIcon,
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
        { type: 'input_value', name: 'SECONDS', check: 'Number' },
      ],
      style: 'sensors_blocks',
      previousStatement: null,
      nextStatement: null,
      extensions: ['shape_statement'],
    },
    {
      type: BLOCK_TYPES.sensor.gray_sensor.twoCalibrate,
      message0: blockMsg('sensor.grayTwoCalibrate'),
      args0: [
        {
          type: 'field_image',
          src: distanceIcon,
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
        { type: 'input_value', name: 'SECONDS', check: 'Number' },
      ],
      style: 'sensors_blocks',
      previousStatement: null,
      nextStatement: null,
      extensions: ['shape_statement'],
    },
    {
      type: BLOCK_TYPES.sensor.ultrasonic_sensor.cmpValue,
      message0: blockMsg('sensor.ultrasonicCmpValue'),
      args0: [
        {
          type: 'field_image',
          src: ultrasonicIcon,
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
          name: 'CMP',
          options: cmpOptions(),
        },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      style: 'sensors_blocks',
      extensions: ['output_boolean'],
    },
    {
      type: BLOCK_TYPES.sensor.ultrasonic_sensor.value,
      message0: blockMsg('sensor.ultrasonicValue'),
      args0: [
        {
          type: 'field_image',
          src: ultrasonicIcon,
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
      ],
      style: 'sensors_blocks',
      extensions: ['output_number'],
    },
    {
      type: BLOCK_TYPES.sensor.remote_control_sensor.keyRemote,
      message0: blockMsg('sensor.remoteKey'),
      args0: [
        {
          type: 'field_image',
          src: handleShankIcon,
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
        { type: 'input_value', name: 'HANDLESHANK', check: 'String' },
        {
          type: 'field_dropdown',
          name: 'STATE',
          options: [
            dropdownOpt('buttonState.pressed', 'press'),
            dropdownOpt('buttonState.notPressed', 'unpress'),
          ],
        },
      ],
      style: 'sensors_blocks',
      extensions: ['output_boolean'],
    },
    {
      type: BLOCK_TYPES.sensor.remote_control_sensor.movSetAdvanceOffset,
      message0: blockMsg('sensor.remoteSetAdvanceOffset'),
      args0: [
        {
          type: 'field_image',
          src: handleShankIcon,
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
        { type: 'input_value', name: 'LEFT_OFFSET', check: 'Number' },
        { type: 'input_value', name: 'RIGHT_OFFSET', check: 'Number' },
      ],
      style: 'sensors_blocks',
      previousStatement: null,
      nextStatement: null,
      extensions: ['shape_statement'],
    },
    {
      type: BLOCK_TYPES.sensor.remote_control_sensor.movSetRetreatOffset,
      message0: blockMsg('sensor.remoteSetRetreatOffset'),
      args0: [
        {
          type: 'field_image',
          src: handleShankIcon,
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
        { type: 'input_value', name: 'LEFT_OFFSET', check: 'Number' },
        { type: 'input_value', name: 'RIGHT_OFFSET', check: 'Number' },
      ],
      style: 'sensors_blocks',
      previousStatement: null,
      nextStatement: null,
      extensions: ['shape_statement'],
    },
    {
      type: BLOCK_TYPES.sensor.remote_control_sensor.readAdcanceLeftOffset,
      message0: blockMsg('sensor.remoteReadAdvanceLeft'),
      args0: [
        {
          type: 'field_image',
          src: handleShankIcon,
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
      style: 'sensors_blocks',
      extensions: ['output_number'],
    },
    {
      type: BLOCK_TYPES.sensor.remote_control_sensor.readAdvanceRightOffset,
      message0: blockMsg('sensor.remoteReadAdvanceRight'),
      args0: [
        {
          type: 'field_image',
          src: handleShankIcon,
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
      style: 'sensors_blocks',
      extensions: ['output_number'],
    },
    {
      type: BLOCK_TYPES.sensor.remote_control_sensor.readRetreatLeftOffset,
      message0: blockMsg('sensor.remoteReadRetreatLeft'),
      args0: [
        {
          type: 'field_image',
          src: handleShankIcon,
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
      style: 'sensors_blocks',
      extensions: ['output_number'],
    },
    {
      type: BLOCK_TYPES.sensor.remote_control_sensor.readRetreatRightOffset,
      message0: blockMsg('sensor.remoteReadRetreatRight'),
      args0: [
        {
          type: 'field_image',
          src: handleShankIcon,
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
      style: 'sensors_blocks',
      extensions: ['output_number'],
    },
    {
      type: BLOCK_TYPES.sensor.other.keyMast,
      message0: blockMsg('sensor.hostKey'),
      args0: [
        {
          type: 'field_dropdown',
          name: 'KEY',
          options: [
            dropdownOpt('hostButton.left', 'left'),
            dropdownOpt('hostButton.right', 'right'),
          ],
        },
        {
          type: 'field_dropdown',
          name: 'STATE',
          options: [
            dropdownOpt('buttonState.pressed', '1'),
            dropdownOpt('buttonState.notPressed', '0'),
          ],
        },
      ],
      style: 'sensors_blocks',
      extensions: ['output_boolean'],
    },
    {
      type: BLOCK_TYPES.sensor.other.timer,
      message0: blockMsg('sensor.timer'),
      style: 'sensors_blocks',
      extensions: ['output_number'],
    },
    {
      type: BLOCK_TYPES.sensor.other.resetTimer,
      message0: blockMsg('sensor.resetTimer'),
      style: 'sensors_blocks',
      previousStatement: null,
      nextStatement: null,
      extensions: ['shape_statement'],
    },
  ];
}
