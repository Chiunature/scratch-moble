import { BLOCK_TYPES } from '../blockTypes';
import combinedMotor from '../../../assets/block/block_music.svg';
import separatorVertical from '../../../assets/block/block_separator_vertical.svg';
import { blockMsg } from './blockI18n';

export function getSoundBlockDefinitions() {
  return [
    {
      type: BLOCK_TYPES.sound.playMusic,
      message0: blockMsg('sound.playMusic'),
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
        { type: 'input_value', name: 'NOTE', check: 'Number' },
        { type: 'input_value', name: 'DURATION', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'sounds_blocks',
    },
  ];
}
