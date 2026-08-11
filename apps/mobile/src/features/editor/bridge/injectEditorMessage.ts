import type { EditorInMessage } from '@scratch-mobile/shared';
import type { WebView } from 'react-native-webview';

export type MessageDeduper = {
  inject: (webView: WebView | null, message: EditorInMessage) => void;
  forceInject: (webView: WebView | null, message: EditorInMessage) => void;
  clear: () => void;
};

/**
 * 完整 payload 去重：仅拦截与上一次完全相同的连续消息。
 * 同一会话内不同 value 必须全部注入（滑块实时更新依赖此语义），禁止按会话维度拦截。
 */
export function createMessageDeduper(): MessageDeduper {
  let lastInjectedPayload: string | null = null;

  const payloadOf = (message: EditorInMessage): string =>
    JSON.stringify(message);

  const inject = (
    webView: WebView | null,
    message: EditorInMessage,
  ): void => {
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
  };

  const forceInject = (
    webView: WebView | null,
    message: EditorInMessage,
  ): void => {
    if (!webView) {
      return;
    }
    const payload = payloadOf(message);
    lastInjectedPayload = payload;
    webView.injectJavaScript(
      `window.__scratchEditorReceiveFromNative?.(${payload});true;`,
    );
  };

  const clear = (): void => {
    lastInjectedPayload = null;
  };

  return { inject, forceInject, clear };
}

/**
 * 编辑器桥共享去重实例：send / locale / persistence 共用同一去重状态，
 * 与历史模块级单例行为一致。
 */
export const editorMessageDeduper = createMessageDeduper();