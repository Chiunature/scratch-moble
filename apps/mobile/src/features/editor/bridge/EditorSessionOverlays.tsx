import type { EditorInMessage } from '@scratch-mobile/shared';

import type { EditorSessions } from './useEditorSessionManager';
import { NumberSliderOverlay } from '../components/NumberSliderOverlay';
import { MatrixLightOverlay } from '../components/MatrixLightOverlay';
import { NotePickerOverlay } from '../components/NotePickerOverlay';
import { HandleShankPickerOverlay } from '../components/HandleShankPickerOverlay';
import { VariablePromptOverlay } from '../components/VariablePromptOverlay';

type Props = {
  sessions: EditorSessions;
  onSend: (message: EditorInMessage, options?: { endSession?: boolean }) => void;
};

/**
 * 把桥会话状态机映射为各 overlay UI。
 * 每个会话组件回调先提交值再 endSession 终结会话。
 */
export function EditorSessionOverlays({ sessions, onSend }: Props) {
  return (
    <>
      <NumberSliderOverlay
        session={sessions.slider}
        onValueChange={(sessionId, value) =>
          onSend({ type: 'editor.numberSlider.value', sessionId, value })
        }
        onClose={sessionId =>
          onSend({ type: 'editor.numberSlider.close', sessionId }, { endSession: true })
        }
      />
      <MatrixLightOverlay
        session={sessions.matrixLight}
        onCommit={(sessionId, rows) =>
          onSend(
            { type: 'editor.matrixLight.commit', sessionId, rows },
            { endSession: true },
          )
        }
        onClose={sessionId =>
          onSend({ type: 'editor.matrixLight.close', sessionId }, { endSession: true })
        }
      />
      <NotePickerOverlay
        session={sessions.notePicker}
        onCommit={(sessionId, value) =>
          onSend(
            { type: 'editor.notePicker.commit', sessionId, value },
            { endSession: true },
          )
        }
        onClose={sessionId =>
          onSend({ type: 'editor.notePicker.close', sessionId }, { endSession: true })
        }
      />
      <HandleShankPickerOverlay
        session={sessions.handleShank}
        onCommit={(sessionId, value) =>
          onSend(
            { type: 'editor.handleShank.commit', sessionId, value },
            { endSession: true },
          )
        }
        onClose={sessionId =>
          onSend({ type: 'editor.handleShank.close', sessionId }, { endSession: true })
        }
      />
      <VariablePromptOverlay
        session={sessions.variablePrompt}
        onCommit={(sessionId, name) =>
          onSend(
            { type: 'editor.variablePrompt.commit', sessionId, name },
            { endSession: true },
          )
        }
        onCancel={sessionId =>
          onSend(
            { type: 'editor.variablePrompt.cancel', sessionId },
            { endSession: true },
          )
        }
      />
    </>
  );
}