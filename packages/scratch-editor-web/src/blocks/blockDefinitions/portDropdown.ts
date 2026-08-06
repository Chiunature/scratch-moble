import {
  MOTOR_PORT_LABELS,
  PORT_LABELS,
  SENSOR_PORT_LABELS,
} from '@scratch-mobile/shared';

import { BLOCK_TYPES } from '../blockTypes';

type DropdownOption = [string, string];

/** 传感器单端口（A-D，值 0-3） */
function sensorSingleOptions(): DropdownOption[] {
  return SENSOR_PORT_LABELS.map((label, index) => [label, String(index)]);
}

/** 电机单端口（E-H，值 4-7） */
function motorSingleOptions(): DropdownOption[] {
  return MOTOR_PORT_LABELS.map((label, index) => [label, String(4 + index)]);
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
 * 单选端口按硬件用途拆分：传感器 A-D、电机 E-H。
 * 双端口仍沿用旧下拉 reporter；多选复选框在下一阶段替换。
 */
export const portDropdownReporterDefinitions = [
  {
    type: BLOCK_TYPES.common.portDropdown,
    message0: '%1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PORT',
        options: sensorSingleOptions(),
      },
    ],
    extensions: ['output_number', 'colours_from_parent'],
  },
  {
    type: BLOCK_TYPES.common.motorPortDropdown,
    message0: '%1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PORT',
        options: motorSingleOptions(),
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
