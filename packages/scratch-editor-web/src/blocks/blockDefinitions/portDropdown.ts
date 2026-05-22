import { BLOCK_TYPES } from '../blockTypes';

/**
 * 通用端口报告积木：field_port_picker 单选/多选由字段 JSON（selectionMode）或逗号初值决定。
 * 存盘 "3" / "1,2"，显示 3 / 1+2。
 */
export const portDropdownReporterDefinitions = [
  {
    type: BLOCK_TYPES.common.portDropdown,
    message0: '%1',
    args0: [
      {
        type: 'field_port_picker',
        name: 'PORT',
        value: '0',
        selectionMode: 'single',
      },
    ],
    output: 'Number',
    outputShape: 2,
    extensions: ['colours_from_parent'],
  },
] as const;
