import { i18n } from '@scratch-mobile/i18n';

/** 非 React 上下文（portPickerOptions） */
export function tEditorOverlay(
  key: string,
  options?: Record<string, unknown>,
): string {
  return i18n.getFixedT(null, 'overlays')(key, options);
}
