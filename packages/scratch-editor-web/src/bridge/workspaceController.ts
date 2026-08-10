import type { EditorInMessage } from '@scratch-mobile/shared';

import type { Workspace } from '../codegen/types';
import { handleEditorLocaleInbound } from './editorLocaleInbound';
import { createCodeGenerationPublisher } from './codeGenerationPublisher';
import { createWorkspaceHistory } from './workspaceHistory';
import { createWorkspacePersistence } from './workspacePersistence';
import { handleNumberSliderInbound } from '../workspace-custom/fields/numberSliderEditor';
import { handleMatrixLightInbound } from '../workspace-custom/fields/matrixLightEditor';
import { handleNotePickerInbound } from '../workspace-custom/fields/notePickerEditor';
import { handleHandleShankInbound } from '../workspace-custom/fields/handleShankPickerEditor';
import { handleVariablePromptInbound } from '../workspace-custom/variablePromptBridge';

/**
 * 编辑器桥统一控制器：
 * - 单一 workspace change 监听，按各 sink 的 debounce 策略分发（persistence 1500ms / codegen 200ms / history 0ms）
 * - 统一 inbound 分发（locale / persistence / field 编辑器）
 * - dispose 释放全部监听与定时器
 */
export type WorkspaceController = {
  handleMessageFromNative: (message: EditorInMessage) => void;
  /** 立即触发一次 codegen 发送（initial / 外部显式刷新） */
  flushCodeGeneration: () => void;
  dispose: () => void;
};

export function createWorkspaceController(
  workspace: Workspace,
): WorkspaceController {
  const codegen = createCodeGenerationPublisher(workspace);
  const history = createWorkspaceHistory(workspace, {
    onCodeGenerationNeeded: () => codegen.flush(),
  });
  const persistence = createWorkspacePersistence(workspace, {
    onWorkspaceLoaded: () => {
      history.clear();
      codegen.flush();
    },
  });

  const handleWorkspaceChange = (): void => {
    persistence.scheduleChange();
    codegen.schedule();
    history.schedulePublish();
  };
  workspace.addChangeListener(handleWorkspaceChange);

  const handleMessageFromNative = (message: EditorInMessage): void => {
    if (handleEditorLocaleInbound(message)) {
      return;
    }

    if (persistence.handleInbound(message)) {
      return;
    }

    switch (message.type) {
      case 'editor.numberSlider.value':
      case 'editor.numberSlider.close':
        handleNumberSliderInbound(message);
        break;
      case 'editor.matrixLight.commit':
      case 'editor.matrixLight.close':
        handleMatrixLightInbound(message, () => codegen.flush());
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
  };

  const dispose = (): void => {
    workspace.removeChangeListener(handleWorkspaceChange);
    persistence.dispose();
    codegen.dispose();
    history.dispose();
  };

  return {
    handleMessageFromNative,
    flushCodeGeneration: () => codegen.flush(),
    dispose,
  };
}