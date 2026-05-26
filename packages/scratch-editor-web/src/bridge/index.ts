export type { EditorInMessage, EditorOutMessage } from '@scratch-mobile/shared';
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
import type { EditorOutMessage } from '@scratch-mobile/shared';

export function postToReactNative(message: EditorOutMessage): void {
  const bridge = (window as RNWindow).ReactNativeWebView;
  if (!bridge?.postMessage) {
    return;
  }
  bridge.postMessage(JSON.stringify(message));
}
