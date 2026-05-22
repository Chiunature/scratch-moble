/**
 * 编辑器相关 RN 配色（Overlay、端口选择器等）。
 * Web 侧 Blockly 主题见 packages/scratch-editor-web/src/theme.ts。
 */

/** 数字滑块气泡 */
export const numberSliderBubbleColors = {
  primary: '#4C97FF',
  secondary: '#4280D7',
} as const;

/** 端口选择底部弹窗（设计稿配色） */
export const portPickerTheme = {
  sheetBg: '#0b1220',
  sheetBorder: '#1e293b',
  panelBg: '#111827',
  panelBorder: '#1f2937',
  textPrimary: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  accent: '#34d399',
  accentGlow: 'rgba(52, 211, 153, 0.45)',
  connected: '#3b82f6',
  warning: '#f97316',
  disconnected: '#475569',
  confirmBg: '#10b981',
  cancelBorder: '#334155',
} as const;
