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
    math_blocks: {
      colourPrimary: '#59C059',
      colourSecondary: '#46B946',
      colourTertiary: '#389438',
    },
    sensors_blocks: {
      colourPrimary: '#34CCF1',
      colourSecondary: '#2EB4D4',
      colourTertiary: '#49C2E1',
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
