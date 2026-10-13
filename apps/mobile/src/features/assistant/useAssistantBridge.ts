import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { EditorInMessage, EditorOutMessage } from '@scratch-mobile/shared';
import { parseEditorOutMessage } from '../editor/bridge/parseEditorMessage';
import { createMessageDeduper } from '../editor/bridge/injectEditorMessage';

type PendingRequest = {
  resolve: (message: EditorOutMessage) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  expectedType: EditorOutMessage['type'];
};

const REQUEST_TIMEOUT_MS = 12000;

export function useAssistantBridge(
  webViewRef: RefObject<WebView | null>,
  projectId: string,
) {
  const pending = useRef(new Map<string, PendingRequest>());
  const sender = useRef(createMessageDeduper());
  const seenRequestIds = useRef(new Set<string>());
  const expiredPreparations = useRef(new Map<string, string>());
  const reset = useCallback(() => {
    for (const entry of pending.current.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error('编辑器已关闭或重载，请重新生成。'));
    }
    pending.current.clear();
    seenRequestIds.current.clear();
    expiredPreparations.current.clear();
    sender.current.clear();
  }, []);
  useEffect(() => reset, [reset, projectId]);
  const request = useCallback(
    (message: EditorInMessage): Promise<EditorOutMessage> => {
      if (
        !webViewRef.current ||
        !('requestId' in message) ||
        !('projectId' in message) ||
        message.projectId !== projectId
      ) {
        return Promise.reject(new Error('编辑器尚未就绪。'));
      }
      if (seenRequestIds.current.has(message.requestId)) {
        return Promise.reject(new Error('请求 ID 已使用，请重新生成请求。'));
      }
      seenRequestIds.current.add(message.requestId);
      if (message.type === 'editor.workspace.candidate.discard') {
        try {
          sender.current.forceInject(webViewRef.current, message);
        } catch {
          return Promise.reject(new Error('无法向编辑器发送请求，请重试。'));
        }
        // Discard is one-way; no candidate is ever applied by this acknowledgement.
        return Promise.resolve({
          type: 'editor.workspace.candidate.rejected',
          requestId: message.requestId,
          projectId,
          reason: '已丢弃',
        });
      }
      if (pending.current.has(message.requestId)) {
        return Promise.reject(new Error('请求已在处理中，请勿重复发送。'));
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.current.delete(message.requestId);
          if (message.type === 'editor.workspace.candidate.prepare') {
            expiredPreparations.current.set(
              message.requestId,
              message.sessionId,
            );
          }
          reject(new Error('编辑器响应超时，请确认当前作品后重试。'));
        }, REQUEST_TIMEOUT_MS);
        const expectedType =
          message.type === 'editor.workspace.snapshot.request'
            ? 'editor.workspace.snapshot'
            : message.type === 'editor.workspace.candidate.prepare'
            ? 'editor.workspace.candidate.ready'
            : 'editor.workspace.candidate.applied';
        pending.current.set(message.requestId, {
          resolve,
          reject,
          timer,
          expectedType,
        });
        try {
          sender.current.forceInject(webViewRef.current, message);
        } catch {
          clearTimeout(timer);
          pending.current.delete(message.requestId);
          reject(new Error('无法向编辑器发送请求，请重试。'));
        }
      });
    },
    [projectId, webViewRef],
  );
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseEditorOutMessage(event.nativeEvent.data);
      if (message?.type === 'editor.workspace.ready') reset();
      if (
        !message ||
        !('requestId' in message) ||
        !('projectId' in message) ||
        message.projectId !== projectId
      )
        return;
      const entry = pending.current.get(message.requestId);
      if (
        !entry &&
        message.type === 'editor.workspace.candidate.ready' &&
        expiredPreparations.current.get(message.requestId) === message.sessionId
      ) {
        expiredPreparations.current.delete(message.requestId);
        // The caller has already received a timeout and cannot clean up this
        // candidate. Discard only this response, never a newer preview.
        if (webViewRef.current) {
          try {
            sender.current.forceInject(webViewRef.current, {
              type: 'editor.workspace.candidate.discard',
              requestId: `cleanup-${message.requestId}`.slice(0, 128),
              projectId,
              sessionId: message.sessionId,
              candidateId: message.candidateId,
            });
          } catch {
            // The editor may have disconnected; the candidate also has a TTL.
          }
        }
        return;
      }
      if (!entry && message.type === 'editor.workspace.candidate.rejected') {
        expiredPreparations.current.delete(message.requestId);
      }
      if (
        !entry ||
        (message.type !== entry.expectedType &&
          message.type !== 'editor.workspace.candidate.rejected')
      )
        return;
      clearTimeout(entry.timer);
      pending.current.delete(message.requestId);
      if (message.type === 'editor.workspace.candidate.rejected')
        entry.reject(new Error(message.reason));
      else entry.resolve(message);
    },
    [projectId, reset, webViewRef],
  );
  return { request, handleMessage, reset };
}
