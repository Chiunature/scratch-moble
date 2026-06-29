import { BLOCK_TYPES } from '../blockTypes';
import startProgramIcon from '../../../assets/block/block_start_program.svg';
import separatorVertical from '../../../assets/block/block_separator_vertical.svg';
import { blockMsg } from './blockI18n';

export function getEventBlockDefinitions() {
  return [
    {
      type: BLOCK_TYPES.event.whenFlagClicked,
      message0: blockMsg('event.whenFlagClicked'),
      args0: [
        {
          type: 'field_image',
          src: startProgramIcon,
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
      nextStatement: null,
      style: 'start_program_blocks',
      extensions: ['shape_hat'],
    },
  ];
}
