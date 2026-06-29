import { BLOCK_TYPES } from '../blockTypes';
import matrixIcon from '../../../assets/block/block_matrix.svg';
import separatorVertical from '../../../assets/block/block_separator_vertical.svg';
import {
  serializeMatrixLightRows,
  DEFAULT_MATRIX_LIGHT_ROWS,
} from '@scratch-mobile/shared';
import { blockMsg, dropdownOpt } from './blockI18n';

export function getMatrixLightBlockDefinitions() {
  return [
    {
      type: BLOCK_TYPES.matrixLight.show,
      message0: blockMsg('matrixLight.show'),
      args0: [
        {
          type: 'field_image',
          src: matrixIcon,
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
          type: 'field_matrix_light',
          name: 'MATRIX',
          value: serializeMatrixLightRows(DEFAULT_MATRIX_LIGHT_ROWS),
        },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'matrix_light_blocks',
    },
    {
      type: BLOCK_TYPES.matrixLight.clear,
      message0: blockMsg('matrixLight.clear'),
      args0: [
        {
          type: 'field_image',
          src: matrixIcon,
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
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'matrix_light_blocks',
    },
    {
      type: BLOCK_TYPES.matrixLight.setBrightness,
      message0: blockMsg('matrixLight.setBrightness'),
      args0: [
        {
          type: 'field_image',
          src: matrixIcon,
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
          name: 'BRIGHTNESS',
          options: [
            ['0', '0'],
            ['1', '1'],
            ['2', '2'],
            ['3', '3'],
            ['4', '4'],
            ['5', '5'],
            ['6', '6'],
            ['7', '7'],
          ],
        },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'matrix_light_blocks',
    },
    {
      type: BLOCK_TYPES.matrixLight.showRoll,
      message0: blockMsg('matrixLight.showRoll'),
      args0: [
        {
          type: 'field_image',
          src: matrixIcon,
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
          name: 'TEXT',
        },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'matrix_light_blocks',
    },
    {
      type: BLOCK_TYPES.matrixLight.setPixelBrightness,
      message0: blockMsg('matrixLight.setPixelBrightness'),
      args0: [
        {
          type: 'field_image',
          src: matrixIcon,
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
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'OPEN',
          options: [
            dropdownOpt('pixelState.on', '1'),
            dropdownOpt('pixelState.off', '0'),
          ],
        },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'matrix_light_blocks',
    },
  ];
}
