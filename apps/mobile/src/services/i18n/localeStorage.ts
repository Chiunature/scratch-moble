import {
  type AppLocale,
  changeAppLocale,
  isAppLocale,
} from '@scratch-mobile/i18n';

import { kvStore } from '../storage/kvStore';

const LOCALE_STORAGE_KEY = '@scratch-mobile/app-locale';

export async function loadSavedLocale(): Promise<AppLocale | null> {
  const saved = await kvStore.getItem(LOCALE_STORAGE_KEY);
  return isAppLocale(saved) ? saved : null;
}

export async function saveAppLocale(locale: AppLocale): Promise<void> {
  await kvStore.setItem(LOCALE_STORAGE_KEY, locale);
  await changeAppLocale(locale);
}
