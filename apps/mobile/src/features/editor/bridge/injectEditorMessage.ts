import type { EditorInMessage } from '@scratch-mobile/shared';
import type { WebView } from 'react-native-webview';

/** 避免连续 inject 相同 payload（如 rAF 合并后重复值） */
let lastInjectedPayload: string | null = null;

export function injectEditorMessage(
  webView: WebView | null,
  message: EditorInMessage,
): void {
  if (!webView) {
    return;
  }
  const payload = JSON.stringify(message);
  if (payload === lastInjectedPayload) {
    return;
  }
  lastInjectedPayload = payload;
  webView.injectJavaScript(
    `window.__scratchEditorReceiveFromNative?.(${payload});true;`,
  );
}

/** 关闭 Overlay 后允许下一会话再次注入相同结构的消息 */
export function resetInjectEditorMessageDedup(): void {
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
  const payload = JSON.stringify(message);
  lastInjectedPayload = payload;
  webView.injectJavaScript(
    `window.__scratchEditorReceiveFromNative?.(${payload});true;`,
  );
}
