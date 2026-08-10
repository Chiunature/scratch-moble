import type { EditorInMessage } from '@scratch-mobile/shared';
import type { WebView } from 'react-native-webview';

/**
 * 会话级防抖：同一 (type, sessionId) 只注入一次（如 rAF 合并后的重复 value）。
 * 会话终结（close/commit/cancel）后调用 invalidateEditorMessageSession 失效，
 * 允许下一会话复用相同 sessionId（同一 field 的 sessionId 稳定生成）。
 */
const sessionDedupKeys = new Set<string>();

function sessionIdOf(message: EditorInMessage): string | null {
  return 'sessionId' in message ? message.sessionId : null;
}

export function injectEditorMessage(
  webView: WebView | null,
  message: EditorInMessage,
): void {
  if (!webView) {
    return;
  }
  const sessionId = sessionIdOf(message);
  if (sessionId) {
    const key = `${message.type}:${sessionId}`;
    if (sessionDedupKeys.has(key)) {
      return;
    }
    sessionDedupKeys.add(key);
  }
  webView.injectJavaScript(
    `window.__scratchEditorReceiveFromNative?.(${JSON.stringify(
      message,
    )});true;`,
  );
}

/** 会话终结后删除该 sessionId 的全部去重键，允许下一会话重新注入相同结构消息 */
export function invalidateEditorMessageSession(sessionId: string): void {
  const suffix = `:${sessionId}`;
  for (const key of sessionDedupKeys) {
    if (key.endsWith(suffix)) {
      sessionDedupKeys.delete(key);
    }
  }
}

/** workspace.load 等同一会话可能重复注入，需跳过去重 */
export function forceInjectEditorMessage(
  webView: WebView | null,
  message: EditorInMessage,
): void {
  if (!webView) {
    return;
  }
  webView.injectJavaScript(
    `window.__scratchEditorReceiveFromNative?.(${JSON.stringify(
      message,
    )});true;`,
  );
}