import { getCurrentAppLocale } from '@scratch-mobile/i18n';
import type { WebView } from 'react-native-webview';

import { forceInjectEditorMessage } from './bridge/injectEditorMessage';

export function injectEditorLocale(webView: WebView | null): void {
  forceInjectEditorMessage(webView, {
    type: 'editor.locale.set',
    locale: getCurrentAppLocale(),
  });
}
