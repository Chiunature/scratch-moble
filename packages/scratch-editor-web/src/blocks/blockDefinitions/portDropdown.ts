import { PORT_LABELS } from '@scratch-mobile/shared';

import { BLOCK_TYPES } from '../blockTypes';

type DropdownOption = [string, string];

function singlePortOptions(): DropdownOption[] {
  return PORT_LABELS.map((label, index) => [label, String(index)]);
}

function pairPortOptions(): DropdownOption[] {
  return PORT_LABELS.flatMap((leftLabel, leftIndex) =>
    PORT_LABELS.slice(leftIndex + 1).map((rightLabel, rightOffset) => {
      const rightIndex = leftIndex + 1 + rightOffset;
      return [`${leftLabel}+${rightLabel}`, `${leftIndex},${rightIndex}`];
    }),
  );
}

/**
 * 端口 reporter 使用 scratch-blocks 原生 field_dropdown。
 * 单端口保存 "3"，双端口保存 "1,2"，与现有代码生成保持兼容。
 */
export const portDropdownReporterDefinitions = [
  {
    type: BLOCK_TYPES.common.portDropdown,
    message0: '%1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PORT',
        options: singlePortOptions(),
      },
    ],
    extensions: ['output_number', 'colours_from_parent'],
  },
  {
    type: BLOCK_TYPES.common.portPairDropdown,
    message0: '%1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PORT',
        options: pairPortOptions(),
      },
    ],
    extensions: ['output_number', 'colours_from_parent'],
  },
] as const;
