import type { EditorInMessage } from './messages';
import { handleNumberSliderInbound } from '../workspace-custom/fields/numberSliderEditor';

export function handleMessageFromNative(message: EditorInMessage): void {
  switch (message.type) {
    case 'editor.numberSlider.value':
    case 'editor.numberSlider.close':
      handleNumberSliderInbound(message);
      break;
  }
}

export function registerNativeInboundBridge(): void {
  (
    window as typeof window & {
      __scratchEditorReceiveFromNative?: (message: EditorInMessage) => void;
    }
  ).__scratchEditorReceiveFromNative = handleMessageFromNative;
}
