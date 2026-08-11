import { getCurrentAppLocale } from '@scratch-mobile/i18n';
import type { WebView } from 'react-native-webview';

import { editorMessageDeduper } from './bridge/injectEditorMessage';

export function injectEditorLocale(webView: WebView | null): void {
  editorMessageDeduper.forceInject(webView, {
    type: 'editor.locale.set',
    locale: getCurrentAppLocale(),
  });
}
