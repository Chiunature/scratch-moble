import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import { getCurrentAppLocale, useTranslation } from '@scratch-mobile/i18n';
import { EDITOR_EMBEDDED_LOCALE_GLOBAL } from '@scratch-mobile/shared';
import type {
  EditorInMessage,
  EditorOutMessage,
  RnHandleShankOpenMessage,
  RnMatrixLightOpenMessage,
  RnNotePickerOpenMessage,
  RnNumberSliderOpenMessage,
  RnVariablePromptOpenMessage,
  RnWorkspaceChangedMessage,
} from '@scratch-mobile/shared';

import { loadEditorBundleHtml } from '../loadEditorBundleHtml';
import { injectEditorLocale } from '../injectEditorLocale';
import { parseEditorOutMessage } from './parseEditorMessage';
import {
  injectEditorMessage,
  invalidateEditorMessageSession,
} from './injectEditorMessage';

export type EditorSessions = {
  slider: RnNumberSliderOpenMessage | null;
  matrixLight: RnMatrixLightOpenMessage | null;
  notePicker: RnNotePickerOpenMessage | null;
  handleShank: RnHandleShankOpenMessage | null;
  variablePrompt: RnVariablePromptOpenMessage | null;
};

const EMPTY_SESSIONS: EditorSessions = {
  slider: null,
  matrixLight: null,
  notePicker: null,
  handleShank: null,
  variablePrompt: null,
};

type BridgeOptions = {
  webViewRef: RefObject<WebView | null>;
  onWorkspaceReady: () => void | Promise<void>;
  onWorkspaceLoaded: (projectId: string) => void;
  onWorkspaceChanged: (message: RnWorkspaceChangedMessage) => void;
};

const SESSION_TYPE_TO_KEY: Partial<
  Record<EditorInMessage['type'], keyof EditorSessions>
> = {
  'editor.numberSlider.value': 'slider',
  'editor.numberSlider.close': 'slider',
  'editor.matrixLight.commit': 'matrixLight',
  'editor.matrixLight.close': 'matrixLight',
  'editor.notePicker.commit': 'notePicker',
  'editor.notePicker.close': 'notePicker',
  'editor.handleShank.commit': 'handleShank',
  'editor.handleShank.close': 'handleShank',
  'editor.variablePrompt.commit': 'variablePrompt',
  'editor.variablePrompt.cancel': 'variablePrompt',
};

function sessionKeyOf(message: EditorInMessage): keyof EditorSessions | null {
  return SESSION_TYPE_TO_KEY[message.type] ?? null;
}

export function useEditorBridge({
  webViewRef,
  onWorkspaceReady,
  onWorkspaceLoaded,
  onWorkspaceChanged,
}: BridgeOptions) {
  const { t, i18n } = useTranslation('editorShell');
  const codePlaceholderRef = useRef(t('loading.codePlaceholder'));
  const lastCodeRef = useRef({ code: '', blockCount: 0 });

  const [sessions, setSessions] = useState<EditorSessions>(EMPTY_SESSIONS);
  const [generatedCode, setGeneratedCode] = useState(() =>
    t('loading.codePlaceholder'),
  );
  const [blockCount, setBlockCount] = useState(0);
  const [editorHtml, setEditorHtml] = useState<string | null>(null);
  const [editorHtmlError, setEditorHtmlError] = useState<string | null>(null);

  /** 发送桥消息；endSession 表示会话终结：清空对应 session 状态并失效该 sessionId 去重键 */
  const send = useCallback(
    (message: EditorInMessage, options?: { endSession?: boolean }) => {
      injectEditorMessage(webViewRef.current, message);
      if (!options?.endSession) {
        return;
      }
      const sessionKey = sessionKeyOf(message);
      const sessionId = 'sessionId' in message ? message.sessionId : null;
      if (sessionKey) {
        setSessions(current =>
          current[sessionKey]?.sessionId === sessionId
            ? { ...current, [sessionKey]: null }
            : current,
        );
      }
      if (sessionId) {
        invalidateEditorMessageSession(sessionId);
      }
    },
    [],
  );

  // WebView → RN 消息：reducer 分发到 session 状态机 / 持久化 / 代码生成
  const handleEditorMessage = useCallback(
    (message: EditorOutMessage) => {
      switch (message.type) {
        case 'editor.workspace.ready':
          // 兜底：embedded 未生效时（如预览）仍同步 App 语言；同语言时 Web 端会 no-op。
          injectEditorLocale(webViewRef.current);
          void onWorkspaceReady();
          return;
        case 'editor.workspace.loaded':
          onWorkspaceLoaded(message.projectId);
          return;
        case 'editor.workspace.changed':
          onWorkspaceChanged(message);
          return;
        case 'editor.code.generated': {
          const { code: nextCode, blockCount: nextBlockCount } = message;
          if (
            lastCodeRef.current.code === nextCode &&
            lastCodeRef.current.blockCount === nextBlockCount
          ) {
            return;
          }
          lastCodeRef.current = { code: nextCode, blockCount: nextBlockCount };
          setGeneratedCode(nextCode);
          setBlockCount(nextBlockCount);
          return;
        }
        case 'editor.numberSlider.open':
          setSessions(current =>
            current.slider?.sessionId === message.sessionId
              ? current
              : { ...current, slider: message },
          );
          return;
        case 'editor.numberSlider.close':
          setSessions(current =>
            current.slider?.sessionId === message.sessionId
              ? { ...current, slider: null }
              : current,
          );
          return;
        case 'editor.matrixLight.open':
          setSessions(current =>
            current.matrixLight?.sessionId === message.sessionId &&
            current.matrixLight.rows === message.rows
              ? current
              : { ...current, matrixLight: message },
          );
          return;
        case 'editor.matrixLight.close':
          setSessions(current =>
            current.matrixLight?.sessionId === message.sessionId
              ? { ...current, matrixLight: null }
              : current,
          );
          return;
        case 'editor.notePicker.open':
          setSessions(current =>
            current.notePicker?.sessionId === message.sessionId &&
            current.notePicker.value === message.value
              ? current
              : { ...current, notePicker: message },
          );
          return;
        case 'editor.notePicker.close':
          setSessions(current =>
            current.notePicker?.sessionId === message.sessionId
              ? { ...current, notePicker: null }
              : current,
          );
          return;
        case 'editor.handleShank.open':
          setSessions(current =>
            current.handleShank?.sessionId === message.sessionId
              ? current
              : { ...current, handleShank: message },
          );
          return;
        case 'editor.handleShank.close':
          setSessions(current =>
            current.handleShank?.sessionId === message.sessionId
              ? { ...current, handleShank: null }
              : current,
          );
          return;
        case 'editor.variablePrompt.open':
          setSessions(current =>
            current.variablePrompt?.sessionId === message.sessionId
              ? current
              : { ...current, variablePrompt: message },
          );
          return;
        case 'editor.variablePrompt.close':
          setSessions(current =>
            current.variablePrompt?.sessionId === message.sessionId
              ? { ...current, variablePrompt: null }
              : current,
          );
          return;
      }
    },
    [onWorkspaceChanged, onWorkspaceLoaded, onWorkspaceReady],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseEditorOutMessage(event.nativeEvent.data);
      if (message) {
        handleEditorMessage(message);
      }
    },
    [handleEditorMessage],
  );

  // bootstrap 首帧前写入 App 语言，避免 WebView 用 navigator 语言渲染飞栏后再闪一下。
  const currentAppLocale = getCurrentAppLocale();
  const editorEmbeddedLocaleScript = useMemo(
    () =>
      `window.${EDITOR_EMBEDDED_LOCALE_GLOBAL}=${JSON.stringify(
        currentAppLocale,
      )};true;`,
    [currentAppLocale],
  );

  useEffect(() => {
    let cancelled = false;
    void loadEditorBundleHtml()
      .then(html => {
        if (!cancelled) {
          setEditorHtml(html);
          setEditorHtmlError(null);
        }
      })
      .catch(error => {
        if (!cancelled) {
          setEditorHtmlError(
            error instanceof Error ? error.message : String(error),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextPlaceholder = t('loading.codePlaceholder');
    setGeneratedCode(prev =>
      prev === codePlaceholderRef.current ? nextPlaceholder : prev,
    );
    codePlaceholderRef.current = nextPlaceholder;
  }, [i18n.language, t]);

  useEffect(() => {
    const syncEditorLocale = () => {
      injectEditorLocale(webViewRef.current);
    };
    i18n.on('languageChanged', syncEditorLocale);
    return () => {
      i18n.off('languageChanged', syncEditorLocale);
    };
  }, [i18n]);

  return {
    sessions,
    generatedCode,
    blockCount,
    editorHtml,
    editorHtmlError,
    editorEmbeddedLocaleScript,
    handleMessage,
    send,
  };
}