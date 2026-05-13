import { BLOCK_TYPES } from '../blockTypes';

/**
 * 通用圆角「端口」报告积木：内嵌 field_dropdown，输出 Number。
 * 可作为任意端口输入槽的 shadow：槽内可选 0-7，也可拔掉换其它 Number 积木。
 * 不在 toolbox 飞出栏单独展示，仅作为槽内默认阴影/复制块使用。
 */
export const portDropdownReporterDefinitions = [
  {
    type: BLOCK_TYPES.common.portDropdown,
    message0: '%1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PORT',
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
    output: 'Number',
    outputShape: 2,
    extensions: ['colours_textfield'],
  },
] as const;
