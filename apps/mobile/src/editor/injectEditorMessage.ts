import type { WebView } from 'react-native-webview';

import type { EditorInMessage } from './editorMessages';

export function injectEditorMessage(
  webView: WebView | null,
  message: EditorInMessage,
): void {
  if (!webView) {
    return;
  }
  //如果webview存在，那么将消息转换为JSON字符串并注入到webview中
  const payload = JSON.stringify(message);
  webView.injectJavaScript(
    `window.__scratchEditorReceiveFromNative?.(${payload});true;`,
  );
}
