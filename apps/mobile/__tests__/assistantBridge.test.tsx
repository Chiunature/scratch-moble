import React, { useRef } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { WebView } from 'react-native-webview';
import type { EditorInMessage, EditorOutMessage } from '@scratch-mobile/shared';
import { useAssistantBridge } from '../src/features/assistant/useAssistantBridge';

type Bridge = ReturnType<typeof useAssistantBridge>;

type HarnessProps = {
  projectId: string;
  webView: WebView;
  bridgeRef: { current: Bridge | null };
};

function Harness({ projectId, webView, bridgeRef }: HarnessProps) {
  const webViewRef = useRef<WebView | null>(webView);
  bridgeRef.current = useAssistantBridge(webViewRef, projectId);
  return null;
}

function snapshotRequest(
  requestId: string,
  projectId = 'project-1',
): EditorInMessage {
  return { type: 'editor.workspace.snapshot.request', requestId, projectId };
}

function snapshotResponse(
  requestId: string,
  projectId = 'project-1',
): EditorOutMessage {
  return {
    type: 'editor.workspace.snapshot',
    requestId,
    projectId,
    sessionId: 'session-1',
    catalogVersion: 'catalog-1',
    workspace: {},
    workspaceHash: 'hash-1',
    code: '',
    blockCount: 0,
    revision: 1,
    blocks: [],
  };
}

function eventFor(message: EditorOutMessage) {
  return { nativeEvent: { data: JSON.stringify(message) } } as never;
}

describe('useAssistantBridge', () => {
  let renderer: TestRenderer.ReactTestRenderer;

  afterEach(async () => {
    if (renderer)
      await act(async () => {
        renderer!.unmount();
      });
    jest.useRealTimers();
  });

  it('resolves matching responses, rejects duplicate request IDs, and ignores mismatched projects', async () => {
    const injectJavaScript = jest.fn();
    const webView = { injectJavaScript } as unknown as WebView;
    const bridgeRef: { current: Bridge | null } = { current: null };
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          projectId="project-1"
          webView={webView}
          bridgeRef={bridgeRef}
        />,
      );
    });

    const first = bridgeRef.current!.request(snapshotRequest('request-1'));
    expect(injectJavaScript).toHaveBeenCalledTimes(1);
    await expect(
      bridgeRef.current!.request(snapshotRequest('request-1')),
    ).rejects.toThrow('请求 ID 已使用');
    await expect(
      bridgeRef.current!.request(snapshotRequest('request-2', 'project-2')),
    ).rejects.toThrow('编辑器尚未就绪');

    await act(async () => {
      bridgeRef.current!.handleMessage(eventFor(snapshotResponse('request-1')));
    });
    await expect(first).resolves.toMatchObject({ requestId: 'request-1' });
  });

  it('rejects pending requests on timeout and reset, then permits IDs after reset', async () => {
    jest.useFakeTimers();
    const injectJavaScript = jest.fn();
    const webView = { injectJavaScript } as unknown as WebView;
    const bridgeRef: { current: Bridge | null } = { current: null };
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          projectId="project-1"
          webView={webView}
          bridgeRef={bridgeRef}
        />,
      );
    });

    const timedOut = bridgeRef.current!.request(snapshotRequest('timeout-1'));
    const timedOutResult = timedOut.catch(error => error);
    await act(async () => {
      jest.advanceTimersByTime(12000);
    });
    await expect(timedOutResult).resolves.toMatchObject({
      message: '编辑器响应超时，请确认当前作品后重试。',
    });

    const resetPending = bridgeRef.current!.request(snapshotRequest('reset-1'));
    const resetResult = resetPending.catch(error => error);
    await act(async () => {
      bridgeRef.current!.reset();
    });
    await expect(resetResult).resolves.toMatchObject({
      message: '编辑器已关闭或重载，请重新生成。',
    });

    const reusedAfterReset = bridgeRef.current!.request(
      snapshotRequest('reset-1'),
    );
    await act(async () => {
      bridgeRef.current!.handleMessage(eventFor(snapshotResponse('reset-1')));
    });
    await expect(reusedAfterReset).resolves.toMatchObject({
      requestId: 'reset-1',
    });
  });

  it('injects a discard scoped to its session and candidate', async () => {
    const injectJavaScript = jest.fn();
    const webView = { injectJavaScript } as unknown as WebView;
    const bridgeRef: { current: Bridge | null } = { current: null };
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          projectId="project-1"
          webView={webView}
          bridgeRef={bridgeRef}
        />,
      );
    });

    const discard: EditorInMessage = {
      type: 'editor.workspace.candidate.discard',
      requestId: 'discard-1',
      projectId: 'project-1',
      sessionId: 'session-1',
      candidateId: 'candidate-1',
    };
    await expect(bridgeRef.current!.request(discard)).resolves.toMatchObject({
      type: 'editor.workspace.candidate.rejected',
    });
    expect(injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining('"sessionId":"session-1"'),
    );
    expect(injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining('"candidateId":"candidate-1"'),
    );
  });

  it('cleans up only a timed-out preparation, not duplicate or unrelated responses', async () => {
    jest.useFakeTimers();
    const injectJavaScript = jest.fn();
    const webView = { injectJavaScript } as unknown as WebView;
    const bridgeRef: { current: Bridge | null } = { current: null };
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          projectId="project-1"
          webView={webView}
          bridgeRef={bridgeRef}
        />,
      );
    });
    const prepare: EditorInMessage = {
      type: 'editor.workspace.candidate.prepare',
      requestId: 'late-prepare',
      projectId: 'project-1',
      sessionId: 'session-1',
      catalogVersion: '1',
      baseWorkspaceHash: 'hash',
      proposal: {
        schemaVersion: 1,
        intent: 'create',
        summary: 'stop',
        operations: [
          { kind: 'replaceMainScript', statements: [{ kind: 'move.stop' }] },
        ],
      },
    };
    const ready: EditorOutMessage = {
      type: 'editor.workspace.candidate.ready',
      requestId: 'late-prepare',
      projectId: 'project-1',
      sessionId: 'session-1',
      candidateId: 'old-candidate',
      baseWorkspaceHash: 'hash',
      candidateWorkspaceHash: 'new-hash',
      code: 'stop()',
      blockCount: 1,
      workspace: {},
    };
    const result = bridgeRef.current!.request(prepare).catch(error => error);
    await act(async () => {
      jest.advanceTimersByTime(12000);
    });
    await expect(result).resolves.toMatchObject({
      message: expect.stringContaining('超时'),
    });
    await act(async () => {
      bridgeRef.current!.handleMessage(eventFor(ready));
    });
    expect(injectJavaScript).toHaveBeenLastCalledWith(
      expect.stringContaining('"candidateId":"old-candidate"'),
    );
    expect(injectJavaScript).toHaveBeenLastCalledWith(
      expect.stringContaining('editor.workspace.candidate.discard'),
    );
    expect(injectJavaScript).toHaveBeenCalledTimes(2);
    await act(async () => {
      bridgeRef.current!.handleMessage(eventFor(ready));
      bridgeRef.current!.handleMessage(
        eventFor({
          ...ready,
          requestId: 'unrelated',
          candidateId: 'new-candidate',
        }),
      );
    });
    expect(injectJavaScript).toHaveBeenCalledTimes(2);
  });

  it('returns a rejected promise if one-way discard injection fails', async () => {
    const webView = {
      injectJavaScript: jest.fn(() => {
        throw new Error('native failure');
      }),
    } as unknown as WebView;
    const bridgeRef: { current: Bridge | null } = { current: null };
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          projectId="project-1"
          webView={webView}
          bridgeRef={bridgeRef}
        />,
      );
    });
    await expect(
      bridgeRef.current!.request({
        type: 'editor.workspace.candidate.discard',
        requestId: 'discard-fail',
        projectId: 'project-1',
        sessionId: 'session-1',
        candidateId: 'candidate-1',
      }),
    ).rejects.toThrow('无法向编辑器发送请求');
  });

  it('resets pending requests when the project changes', async () => {
    const webView = { injectJavaScript: jest.fn() } as unknown as WebView;
    const bridgeRef: { current: Bridge | null } = { current: null };
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          projectId="project-1"
          webView={webView}
          bridgeRef={bridgeRef}
        />,
      );
    });
    const pending = bridgeRef.current!.request(
      snapshotRequest('project-change'),
    );
    const pendingResult = pending.catch(error => error);

    await act(async () => {
      renderer.update(
        <Harness
          projectId="project-2"
          webView={webView}
          bridgeRef={bridgeRef}
        />,
      );
    });
    await expect(pendingResult).resolves.toMatchObject({
      message: '编辑器已关闭或重载，请重新生成。',
    });
  });
});
