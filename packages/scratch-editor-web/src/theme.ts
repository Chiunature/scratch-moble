/**
 * 编辑器主题配色。
 * blockStyles    — 各积木分类的主色 / 次色 / 第三色
 * categoryStyles — 工具栏分类标签的颜色
 * componentStyles — 工作区背景、工具栏、飞出栏、滚动条等全局组件颜色
 */
import * as ScratchBlocks from 'scratch-blocks';

import { TOOLBOX_CATEGORIES } from './blocks/toolbox';

export const editorTheme = ScratchBlocks.Theme.defineTheme('scratch-mobile', {
  name: 'scratch-mobile',
  blockStyles: {
    motion_blocks: {
      colourPrimary: '#4C97FF',
      colourSecondary: '#4280D7',
      colourTertiary: '#3373CC',
    },
    move_blocks: {
      colourPrimary: '#ff4ccd',
      colourSecondary: '#ff33a3',
      colourTertiary: '#e03cb1',
    },
    matrix_light_blocks: {
      colourPrimary: '#9966FF',
      colourSecondary: '#855CD6',
      colourTertiary: '#774DCB',
    },

    start_program_blocks: {
      colourPrimary: '#FFBF00',
      colourSecondary: '#DEB12D',
      colourTertiary: '#CC9900',
    },
    sounds_blocks:{
      colourPrimary: '#CF63CF',
      colourSecondary: '#BF57B3',
      colourTertiary: '#A34B99',
    },
    control_blocks: {
      colourPrimary: '#FFAB19',
      colourSecondary: '#CF8D17',
      colourTertiary: '#F2A118',
    },
    /** scratch-blocks 内置 operator_* 使用 colours_operators → style 名 operators */
    operators: {
      colourPrimary: '#59C059',
      colourSecondary: '#46B946',
      colourTertiary: '#389438',
    },
    sensors_blocks: {
      colourPrimary: '#34CCF1',
      colourSecondary: '#2EB4D4',
      colourTertiary: '#49C2E1',
    },
    /** scratch-blocks 内置 data_* / data_lists */
    data: {
      colourPrimary: '#FF8C1A',
      colourSecondary: '#DB6E00',
      colourTertiary: '#CC6600',
    },
    data_lists: {
      colourPrimary: '#FF661A',
      colourSecondary: '#DB5500',
      colourTertiary: '#CC4D00',
    },
    /** scratch-blocks 内置 procedures_*（colours_more） */
    more: {
      colourPrimary: '#FF6680',
      colourSecondary: '#E64D66',
      colourTertiary: '#CC3D55',
    },
    /** scratch-blocks 内置 math_number / text 等（colours_textfield） */
    textField: {
      colourPrimary: '#FFFFFF',
      colourSecondary: '#FFFFFF',
      colourTertiary: '#C8C8C8',
    },
    /** colours_from_parent 在飞栏内无父块时的兜底；与 textField 一致 */
    text_blocks: {
      colourPrimary: '#FFFFFF',
      colourSecondary: '#FFFFFF',
      colourTertiary: '#C8C8C8',
    },
    /** 键盘数字阴影、滑块阴影（math_positive_number_keyboard 等） */
    math_blocks: {
      colourPrimary: '#FFFFFF',
      colourSecondary: '#FFFFFF',
      colourTertiary: '#C8C8C8',
    },
  },
  categoryStyles: Object.fromEntries(
    // 键须与 toolboxJson 里各分类的 categorystyle 一致（如 motor → motor_category）
    TOOLBOX_CATEGORIES.map(c => [`${c.id}_category`, { colour: c.colour }]),
  ),
  componentStyles: {
    workspaceBackgroundColour: '#f3f6ff',
    toolboxBackgroundColour: '#ffffff',
    toolboxForegroundColour: '#1f2937',
    flyoutBackgroundColour: '#ffffff',
    flyoutForegroundColour: '#1f2937',
    flyoutOpacity: 1,
    scrollbarColour: '#b8c2d1',
    insertionMarkerColour: '#111827',
    insertionMarkerOpacity: 0.3,
    cursorColour: '#111827',
  },
});
