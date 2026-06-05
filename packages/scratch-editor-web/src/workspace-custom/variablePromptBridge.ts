import type { EditorInMessage } from '@scratch-mobile/shared';

import { isReactNativeHost, postToReactNative } from '../bridge/index';

type VariablePromptCallback = (
  variableName: string,
  additionalVars: string[],
  variableOptions?: { scope?: string; isCloud?: boolean },
) => void;

type VariablePromptSession = {
  callback: VariablePromptCallback;
};

const sessions = new Map<string, VariablePromptSession>();

function createSessionId(): string {
  return `variable-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function closeSession(sessionId: string): VariablePromptSession | null {
  const session = sessions.get(sessionId) ?? null;
  sessions.delete(sessionId);
  postToReactNative({ type: 'editor.variablePrompt.close', sessionId });
  return session;
}

function showWebFallbackPrompt({
  sessionId,
  title,
  message,
  defaultValue,
}: {
  sessionId: string;
  title: string;
  message: string;
  defaultValue: string;
}): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'scratch-variable-prompt-backdrop';

  const panel = document.createElement('div');
  panel.className = 'scratch-variable-prompt-panel';
  panel.addEventListener('click', event => event.stopPropagation());

  const heading = document.createElement('div');
  heading.className = 'scratch-variable-prompt-title';
  heading.textContent = title;

  const description = document.createElement('div');
  description.className = 'scratch-variable-prompt-message';
  description.textContent = message;

  const input = document.createElement('input');
  input.className = 'scratch-variable-prompt-input';
  input.value = defaultValue;

  const actions = document.createElement('div');
  actions.className = 'scratch-variable-prompt-actions';

  const cancel = document.createElement('button');
  cancel.className = 'scratch-variable-prompt-button scratch-variable-prompt-button-secondary';
  cancel.type = 'button';
  cancel.textContent = '取消';

  const confirm = document.createElement('button');
  confirm.className = 'scratch-variable-prompt-button scratch-variable-prompt-button-primary';
  confirm.type = 'button';
  confirm.textContent = '确定';

  const remove = () => backdrop.remove();
  const handleCancel = () => {
    remove();
    handleVariablePromptInbound({ type: 'editor.variablePrompt.cancel', sessionId });
  };
  const handleCommit = () => {
    remove();
    handleVariablePromptInbound({
      type: 'editor.variablePrompt.commit',
      sessionId,
      name: input.value,
    });
  };

  backdrop.addEventListener('click', handleCancel);
  cancel.addEventListener('click', handleCancel);
  confirm.addEventListener('click', handleCommit);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      handleCommit();
    }
    if (event.key === 'Escape') {
      handleCancel();
    }
  });

  actions.append(cancel, confirm);
  panel.append(heading, description, input, actions);
  backdrop.append(panel);
  document.body.append(backdrop);
  input.focus();
  input.select();
}

export function openVariablePrompt({
  message,
  defaultValue,
  callback,
  title,
  varType,
}: {
  message: string;
  defaultValue: string;
  callback: VariablePromptCallback;
  title?: string;
  varType?: string;
}): void {
  const sessionId = createSessionId();
  const promptTitle = title || (varType === 'list' ? '建立列表' : '建立变量');
  sessions.set(sessionId, { callback });

  if (isReactNativeHost()) {
    postToReactNative({
      type: 'editor.variablePrompt.open',
      sessionId,
      title: promptTitle,
      message,
      defaultValue,
      varType,
    });
    return;
  }

  showWebFallbackPrompt({
    sessionId,
    title: promptTitle,
    message,
    defaultValue,
  });
}

export function handleVariablePromptInbound(message: EditorInMessage): void {
  if (
    message.type !== 'editor.variablePrompt.commit' &&
    message.type !== 'editor.variablePrompt.cancel'
  ) {
    return;
  }

  const session = closeSession(message.sessionId);
  if (!session) {
    return;
  }

  if (message.type === 'editor.variablePrompt.cancel') {
    session.callback('', []);
    return;
  }

  session.callback(message.name.trim(), []);
}
