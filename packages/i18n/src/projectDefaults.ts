import { APP_LOCALES, i18n } from './initI18n';

/** 历史版本 shared 常量，用于识别旧默认项目名 */
const LEGACY_DEFAULT_PROJECT_NAMES = ['未命名作品'] as const;

function getKnownDefaultProjectNames(): Set<string> {
  const names = APP_LOCALES.flatMap(locale => {
    const value = i18n.getResource(locale, 'projects', 'defaultProjectName');
    return typeof value === 'string' ? [value] : [];
  });

  return new Set([...names, ...LEGACY_DEFAULT_PROJECT_NAMES]);
}

export function getDefaultProjectName(): string {
  return i18n.t('projects:defaultProjectName');
}

/** 展示用：默认项目名随当前语言切换，用户自定义名称原样返回 */
export function resolveProjectDisplayName(storedName: string): string {
  if (getKnownDefaultProjectNames().has(storedName)) {
    return getDefaultProjectName();
  }
  return storedName;
}

export function isDefaultProjectName(storedName: string): boolean {
  return getKnownDefaultProjectNames().has(storedName);
}
