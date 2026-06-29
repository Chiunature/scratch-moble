export const EDITOR_APP_LOCALES = ['zh-CN', 'zh-TW', 'en'] as const;

export type EditorAppLocale = (typeof EDITOR_APP_LOCALES)[number];

export function isEditorAppLocale(
  value: string | null | undefined,
): value is EditorAppLocale {
  return EDITOR_APP_LOCALES.includes(value as EditorAppLocale);
}
