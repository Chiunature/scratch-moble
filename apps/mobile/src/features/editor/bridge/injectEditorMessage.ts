import type { EditorInMessage } from '@scratch-mobile/shared';
import type { WebView } from 'react-native-webview';

let lastInjectedPayload: string | null = null;

function payloadOf(message: EditorInMessage): string {
  return JSON.stringify(message);
}

export function injectEditorMessage(
  webView: WebView | null,
  message: EditorInMessage,
): void {
  if (!webView) {
    return;
  }

  const payload = payloadOf(message);
  if (payload === lastInjectedPayload) {
    return;
  }

  lastInjectedPayload = payload;
  webView.injectJavaScript(
    `window.__scratchEditorReceiveFromNative?.(${payload});true;`,
  );
}

export function invalidateEditorMessageSession(_sessionId: string): void {
  lastInjectedPayload = null;
}

/** workspace.load 等同一会话可能重复注入，需跳过去重 */
export function forceInjectEditorMessage(
  webView: WebView | null,
  message: EditorInMessage,
): void {
  if (!webView) {
    return;
  }

  const payload = payloadOf(message);
  lastInjectedPayload = payload;
  webView.injectJavaScript(
    `window.__scratchEditorReceiveFromNative?.(${payload});true;`,
  );
}
