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
    event_blocks: {
      colourPrimary: '#FFBF00',
      colourSecondary: '#E6AC00',
      colourTertiary: '#CC9900',
    },
    motion_blocks: {
      colourPrimary: '#4C97FF',
      colourSecondary: '#4280D7',
      colourTertiary: '#3373CC',
    },
    looks_blocks: {
      colourPrimary: '#9966FF',
      colourSecondary: '#855CD6',
      colourTertiary: '#774DCB',
    },
    math_blocks: {
      colourPrimary: '#59C059',
      colourSecondary: '#46B946',
      colourTertiary: '#389438',
    },
    text_blocks: {
      colourPrimary: '#FFBF00',
      colourSecondary: '#E6AC00',
      colourTertiary: '#CC9900',
    },
    logic_blocks: {
      colourPrimary: '#4C97FF',
      colourSecondary: '#4280D7',
      colourTertiary: '#3373CC',
    },
    loop_blocks: {
      colourPrimary: '#0FBD8C',
      colourSecondary: '#0DA57A',
      colourTertiary: '#0B8E69',
    },
    event: {
      colourPrimary: '#FFBF00',
      colourSecondary: '#E6AC00',
      colourTertiary: '#CC9900',
    },
    motion: {
      colourPrimary: '#4C97FF',
      colourSecondary: '#4280D7',
      colourTertiary: '#3373CC',
    },
    looks: {
      colourPrimary: '#9966FF',
      colourSecondary: '#855CD6',
      colourTertiary: '#774DCB',
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
