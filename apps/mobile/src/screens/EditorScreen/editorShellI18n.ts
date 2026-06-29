import { i18n } from '@scratch-mobile/i18n';

/** Editor 壳层 / Pika 工作流（非 React 上下文） */
export function tEditorShell(
  key: string,
  options?: Record<string, unknown>,
): string {
  return i18n.getFixedT(null, 'editorShell')(key, options);
}
