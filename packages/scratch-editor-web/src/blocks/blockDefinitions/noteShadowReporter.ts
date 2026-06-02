import { BLOCK_TYPES } from '../blockTypes';

/**
 * note_picker 阴影 reporter：存储 pitch（0–36），字段 NOTE。
 * 存盘 pitch（0–36）；显示与 codegen 均经 pitchToDisplayName 转为音名（如 "C1"）。
 */
export const noteShadowReporterDefinitions = [
  {
    type: BLOCK_TYPES.common.notePicker,
    message0: '%1',
    args0: [
      {
        type: 'field_note_picker',
        name: 'NOTE',
        value: '12',
      },
    ],
    extensions: ['output_number', 'colours_from_parent'],
  },
] as const;
