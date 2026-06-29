import { tEditor } from '@scratch-mobile/i18n';

export function blockMsg(key: string): string {
  return tEditor(`blocks.${key}`);
}

export function blockOpt(key: string): string {
  return tEditor(`blockOptions.${key}`);
}

export function dropdownOpt(
  labelKey: string,
  value: string,
): [string, string] {
  return [blockOpt(labelKey), value];
}
