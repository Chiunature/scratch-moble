import type { EditorInMessage } from '@scratch-mobile/shared';
import { handleEditorLocaleInbound } from './editorLocaleInbound';
import { handleNumberSliderInbound } from '../workspace-custom/fields/numberSliderEditor';
import { handleMatrixLightInbound } from '../workspace-custom/fields/matrixLightEditor';
import { handleNotePickerInbound } from '../workspace-custom/fields/notePickerEditor';
import { handleHandleShankInbound } from '../workspace-custom/fields/handleShankPickerEditor';
import { handleVariablePromptInbound } from '../workspace-custom/variablePromptBridge';
import { handleWorkspacePersistenceInbound } from './workspacePersistence';
import { handleWorkspaceHistoryInbound } from './workspaceHistory';

export function handleMessageFromNative(message: EditorInMessage): void {
  if (handleEditorLocaleInbound(message)) {
    return;
  }

  if (handleWorkspacePersistenceInbound(message)) {
    return;
  }

  if (handleWorkspaceHistoryInbound(message)) {
    return;
  }

  switch (message.type) {
    case 'editor.numberSlider.value':
    case 'editor.numberSlider.close':
      handleNumberSliderInbound(message);
      break;
    case 'editor.matrixLight.commit':
    case 'editor.matrixLight.close':
      handleMatrixLightInbound(message);
      break;
    case 'editor.notePicker.commit':
    case 'editor.notePicker.close':
      handleNotePickerInbound(message);
      break;
    case 'editor.handleShank.commit':
    case 'editor.handleShank.close':
      handleHandleShankInbound(message);
      break;
    case 'editor.variablePrompt.commit':
    case 'editor.variablePrompt.cancel':
      handleVariablePromptInbound(message);
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
