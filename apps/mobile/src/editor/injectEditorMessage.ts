import type { WebView } from 'react-native-webview';

import type { EditorInMessage } from './editorMessages';

export function injectEditorMessage(
  webView: WebView | null,
  message: EditorInMessage,
): void {
  if (!webView) {
    return;
  }
  const payload = JSON.stringify(message);
  webView.injectJavaScript(
    `window.__scratchEditorReceiveFromNative?.(${payload});true;`,
  );
}
