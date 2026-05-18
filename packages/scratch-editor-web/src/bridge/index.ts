import type { EditorInMessage, EditorOutMessage } from './messages';

export type { EditorInMessage, EditorOutMessage };
export { handleMessageFromNative, registerNativeInboundBridge } from './nativeInbound';

export function isReactNativeHost(): boolean {
  return Boolean(
    (
      window as typeof window & {
        ReactNativeWebView?: { postMessage: (raw: string) => void };
      }
    ).ReactNativeWebView?.postMessage,
  );
}

export function postToReactNative(message: EditorOutMessage): void {
  const bridge = (
    window as typeof window & {
      ReactNativeWebView?: { postMessage: (raw: string) => void };
    }
  ).ReactNativeWebView;
  if (bridge?.postMessage) {
    bridge.postMessage(JSON.stringify(message));
  }
}
