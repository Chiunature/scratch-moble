import type { EditorInMessage, EditorOutMessage } from './messages';

export type { EditorInMessage, EditorOutMessage };
export {
  handleMessageFromNative,
  registerNativeInboundBridge,
} from './nativeInbound';

interface RNWindow {
  ReactNativeWebView?: { postMessage: (raw: string) => void };
}
/** 检查webview是否运行在react native环境中 */
export function isReactNativeHost(): boolean {
  return Boolean((window as RNWindow).ReactNativeWebView?.postMessage);
}

/** 发送消息到React Native */
export function postToReactNative(message: EditorOutMessage): void {
  // 检查webview是否运行在react native环境中
  const bridge = (window as RNWindow).ReactNativeWebView;
  // 如果webview运行在react native环境中，则发送消息到React Native
  if (bridge?.postMessage) {
    // 发送消息到React Native
    bridge.postMessage(JSON.stringify(message));
  }
}
