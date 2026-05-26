import type { EditorInMessage } from '@scratch-mobile/shared';
import { handleNumberSliderInbound } from '../workspace-custom/fields/numberSliderEditor';
import { handlePortPickerInbound } from '../workspace-custom/fields/portPickerEditor';
import { handleMatrixLightInbound } from '../workspace-custom/fields/matrixLightEditor';

export function handleMessageFromNative(message: EditorInMessage): void {
  switch (message.type) {
    case 'editor.numberSlider.value':
    case 'editor.numberSlider.close':
      handleNumberSliderInbound(message);
      break;
    case 'editor.portPicker.value':
    case 'editor.portPicker.close':
      handlePortPickerInbound(message);
      break;
    case 'editor.matrixLight.commit':
    case 'editor.matrixLight.close':
      handleMatrixLightInbound(message);
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
