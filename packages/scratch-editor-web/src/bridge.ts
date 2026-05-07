/**
 * WebView ↔ React Native 通信桥。
 * OutMessage 定义从编辑器发往 RN 的消息格式；
 * postToReactNative 通过 ReactNativeWebView.postMessage 发送 JSON 字符串。
 * 在非 RN 环境（浏览器直接调试）中调用时会静默跳过，不会报错。
 */
export type OutMessage = {
  type: 'editor.code.generated';
  code: string;
  blockCount: number;
};

export function postToReactNative(message: OutMessage): void {
  const bridge = (
    window as { ReactNativeWebView?: { postMessage: (raw: string) => void } }
  ).ReactNativeWebView;
  if (bridge?.postMessage) {
    bridge.postMessage(JSON.stringify(message));
  }
}
