export const EDITOR_APP_LOCALES = ['zh-CN', 'zh-TW', 'en'] as const;

export type EditorAppLocale = (typeof EDITOR_APP_LOCALES)[number];

export function isEditorAppLocale(
  value: string | null | undefined,
): value is EditorAppLocale {
  return EDITOR_APP_LOCALES.includes(value as EditorAppLocale);
}

/** RN WebView 在 HTML 执行前注入，供 bootstrap 首帧即用 App 语言，避免飞栏中文闪屏。 */
export const EDITOR_EMBEDDED_LOCALE_GLOBAL = '__SCRATCH_EDITOR_APP_LOCALE__';
