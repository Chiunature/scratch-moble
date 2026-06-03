import { BLOCK_TYPES } from '../blockTypes';

/**
 * handle_shank_picker 阴影 reporter：存储手柄按键名（up/down/left/right/L1/R1/y/a/b/x）。
 */
export const handleShankShadowReporterDefinitions = [
  {
    type: BLOCK_TYPES.common.handleShankPicker,
    message0: '%1',
    output: 'String',
    args0: [
      {
        type: 'field_handle_shank_picker',
        name: 'HANDLESHANK',
        value: 'up',
      },
    ],
    extensions: ['colours_from_parent'],
  },
] as const;