import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enBle from './locales/en/ble.json';
import enCommon from './locales/en/common.json';
import enDeviceWatch from './locales/en/deviceWatch.json';
import enEditor from './locales/en/editor.json';
import enHome from './locales/en/home.json';
import enNavigation from './locales/en/navigation.json';
import enOverlays from './locales/en/overlays.json';
import enProjects from './locales/en/projects.json';
import enSettings from './locales/en/settings.json';
import zhCNBle from './locales/zh-CN/ble.json';
import zhCNCommon from './locales/zh-CN/common.json';
import zhCNDeviceWatch from './locales/zh-CN/deviceWatch.json';
import zhCNEditor from './locales/zh-CN/editor.json';
import zhCNHome from './locales/zh-CN/home.json';
import zhCNNavigation from './locales/zh-CN/navigation.json';
import zhCNOverlays from './locales/zh-CN/overlays.json';
import zhCNProjects from './locales/zh-CN/projects.json';
import zhCNSettings from './locales/zh-CN/settings.json';
import zhTWBle from './locales/zh-TW/ble.json';
import zhTWCommon from './locales/zh-TW/common.json';
import zhTWDeviceWatch from './locales/zh-TW/deviceWatch.json';
import zhTWEditor from './locales/zh-TW/editor.json';
import zhTWHome from './locales/zh-TW/home.json';
import zhTWNavigation from './locales/zh-TW/navigation.json';
import zhTWOverlays from './locales/zh-TW/overlays.json';
import zhTWProjects from './locales/zh-TW/projects.json';
import zhTWSettings from './locales/zh-TW/settings.json';

export const I18N_NAMESPACES = [
  'common',
  'navigation',
  'home',
  'projects',
  'editor',
  'overlays',
  'deviceWatch',
  'ble',
  'settings',
] as const;

export const APP_LOCALES = ['zh-CN', 'zh-TW', 'en'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const LOCALE_LABEL_KEY: Record<AppLocale, string> = {
  'zh-CN': 'languageOptions.simplifiedChinese',
  'zh-TW': 'languageOptions.traditionalChinese',
  en: 'languageOptions.english',
};

const resources = {
  'zh-CN': {
    common: zhCNCommon,
    navigation: zhCNNavigation,
    home: zhCNHome,
    projects: zhCNProjects,
    editor: zhCNEditor,
    overlays: zhCNOverlays,
    deviceWatch: zhCNDeviceWatch,
    ble: zhCNBle,
    settings: zhCNSettings,
  },
  'zh-TW': {
    common: zhTWCommon,
    navigation: zhTWNavigation,
    home: zhTWHome,
    projects: zhTWProjects,
    editor: zhTWEditor,
    overlays: zhTWOverlays,
    deviceWatch: zhTWDeviceWatch,
    ble: zhTWBle,
    settings: zhTWSettings,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    home: enHome,
    projects: enProjects,
    editor: enEditor,
    overlays: enOverlays,
    deviceWatch: enDeviceWatch,
    ble: enBle,
    settings: enSettings,
  },
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale);
}

export function getCurrentAppLocale(): AppLocale {
  const resolved = i18n.resolvedLanguage ?? i18n.language;
  if (isAppLocale(resolved)) {
    return resolved;
  }
  if (resolved.startsWith('zh')) {
    return resolved.includes('TW') || resolved.includes('Hant') ? 'zh-TW' : 'zh-CN';
  }
  if (resolved.startsWith('en')) {
    return 'en';
  }
  return 'zh-CN';
}

export async function changeAppLocale(locale: AppLocale) {
  await i18n.changeLanguage(locale);
}

export async function initI18n(locale: AppLocale = 'zh-CN') {
  if (i18n.isInitialized) {
    if (getCurrentAppLocale() !== locale) {
      await changeAppLocale(locale);
    }
    return i18n;
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    supportedLngs: [...APP_LOCALES],
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
    fallbackLng: {
      'zh-TW': ['zh-CN'],
      default: ['zh-CN'],
    },
    defaultNS: 'common',
    ns: [...I18N_NAMESPACES],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

  return i18n;
}

export { i18n };
