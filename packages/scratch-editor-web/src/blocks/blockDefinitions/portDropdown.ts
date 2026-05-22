import { BLOCK_TYPES } from '../blockTypes';

/**
 * 通用圆角「端口」报告积木：内嵌 field_port_picker，输出 Number。
 * 可选端口列表在 RN（apps/mobile/src/editor/portPickerOptions.ts）定义；
 * 用户确认后 Web 通过 editor.portPicker.value 接收并写入 PORT 字段。
 * 颜色：`extensions: ['colours_from_parent']` 跟随父积木；RN 弹窗配色见 portPickerOptions。
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
      },
    ],
    output: 'Number',
    outputShape: 2,
    extensions: ['colours_from_parent'],
  },
] as const;
