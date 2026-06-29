export {
  initI18n,
  i18n,
  changeAppLocale,
  getCurrentAppLocale,
  isAppLocale,
  I18N_NAMESPACES,
  APP_LOCALES,
  LOCALE_LABEL_KEY,
  type AppLocale,
} from './initI18n';
export {
  getDefaultProjectName,
  isDefaultProjectName,
  resolveProjectDisplayName,
} from './projectDefaults';
export {
  initEditorWebI18n,
  mapAppLocaleToScratchBlocksLocale,
  resolveEditorWebLocale,
  tEditor,
} from './initEditorWebI18n';
export { I18nextProvider, useTranslation, Trans } from 'react-i18next';
