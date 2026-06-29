import i18n from 'i18next';

import enEditor from './locales/en/editor.json';
import zhCNEditor from './locales/zh-CN/editor.json';
import zhTWEditor from './locales/zh-TW/editor.json';
import { type AppLocale, isAppLocale } from './initI18n';

const EDITOR_WEB_RESOURCES = {
  'zh-CN': { editor: zhCNEditor },
  'zh-TW': { editor: zhTWEditor },
  en: { editor: enEditor },
} as const;

export function tEditor(
  key: string,
  options?: Record<string, unknown>,
): string {
  return i18n.t(key, { ns: 'editor', ...options });
}

export async function initEditorWebI18n(locale: AppLocale): Promise<void> {
  if (i18n.isInitialized) {
    await i18n.changeLanguage(locale);
    return;
  }

  await i18n.init({
    resources: EDITOR_WEB_RESOURCES,
    lng: locale,
    supportedLngs: ['zh-CN', 'zh-TW', 'en'],
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
    fallbackLng: {
      'zh-TW': ['zh-CN'],
      default: ['zh-CN'],
    },
    defaultNS: 'editor',
    ns: ['editor'],
    interpolation: { escapeValue: false },
  });
}

export function resolveEditorWebLocale(
  value: string | null | undefined,
): AppLocale {
  if (isAppLocale(value)) {
    return value;
  }
  if (value?.startsWith('zh')) {
    return value.includes('TW') || value.includes('Hant') ? 'zh-TW' : 'zh-CN';
  }
  if (value?.startsWith('en')) {
    return 'en';
  }
  return 'zh-CN';
}

export function mapAppLocaleToScratchBlocksLocale(
  locale: AppLocale,
): 'zh-cn' | 'en' {
  return locale === 'en' ? 'en' : 'zh-cn';
}
