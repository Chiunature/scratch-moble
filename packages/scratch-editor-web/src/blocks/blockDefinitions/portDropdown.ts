import { MOTOR_PORT_LABELS, SENSOR_PORT_LABELS } from '@scratch-mobile/shared';

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

/**
 * 端口 reporter 按硬件用途拆分：传感器 A-D、电机 E-H。
 * 双端口 reporter 使用 WebView 内复选下拉，字段值仍保存为 "0,1" / "4,5"。
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
        type: 'field_port_multi',
        name: 'PORT',
        value: '0,1',
        portKind: 'sensor',
      },
    ],
    extensions: ['output_number', 'colours_from_parent'],
  },
  {
    type: BLOCK_TYPES.common.motorPortPairDropdown,
    message0: '%1',
    args0: [
      {
        type: 'field_port_multi',
        name: 'PORT',
        value: '4,5',
        portKind: 'motor',
      },
    ],
    extensions: ['output_number', 'colours_from_parent'],
  },
] as const;
