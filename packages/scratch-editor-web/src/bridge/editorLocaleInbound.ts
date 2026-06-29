import { isEditorAppLocale } from '@scratch-mobile/shared';
import type { EditorInMessage } from '@scratch-mobile/shared';

import { applyEditorLocale } from '../locale/applyEditorLocale';

export function handleEditorLocaleInbound(message: EditorInMessage): boolean {
  if (message.type !== 'editor.locale.set') {
    return false;
  }

  if (!isEditorAppLocale(message.locale)) {
    return true;
  }

  void applyEditorLocale(message.locale).catch(error => {
    console.error('[editor] applyEditorLocale failed', error);
  });
  return true;
}
