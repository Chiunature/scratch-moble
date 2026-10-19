import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import type { EditorInMessage, EditorOutMessage } from '@scratch-mobile/shared';
import { AssistantPanel } from '../src/features/assistant/AssistantPanel';

jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: { CacheDir: '/cache' },
    unlink: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('../src/services/assistant', () => ({
  getAssistantConnection: jest.fn(),
  generateAssistantCode: jest.fn(),
}));
jest.mock('../src/services/pika', () => ({
  compileGeneratedCode: jest.fn(),
}));

const { getAssistantConnection, generateAssistantCode } = jest.requireMock(
  '../src/services/assistant',
) as {
  getAssistantConnection: jest.Mock;
  generateAssistantCode: jest.Mock;
};
const { compileGeneratedCode } = jest.requireMock('../src/services/pika') as {
  compileGeneratedCode: jest.Mock;
};
const ReactNativeBlobUtil = jest.requireMock('react-native-blob-util') as {
  fs: { unlink: jest.Mock };
};

type HarnessProps = {
  projectId: string;
  request: (message: EditorInMessage) => Promise<EditorOutMessage>;
  onClose: jest.Mock;
};

function renderPanel(props: HarnessProps) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<AssistantPanel {...props} />);
  });
  return renderer!;
}

function findText(renderer: TestRenderer.ReactTestRenderer, text: string) {
  return renderer.root
    .findAllByType('Text' as never)
    .some(node => node.props.children === text);
}

function findButton(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAllByProps({ accessibilityLabel: label })[0];
}

function findInput(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findByType('TextInput' as never);
}

function snapshotResponse(
  requestId: string,
  projectId: string,
): EditorOutMessage {
  return {
    type: 'editor.workspace.snapshot',
    requestId,
    projectId,
    sessionId: 'session-1',
    catalogVersion: 'catalog-1',
    workspace: {},
    workspaceHash: 'hash-1',
    code: 'old()',
    blockCount: 1,
    revision: 1,
    blocks: [],
  };
}

function readyResponse(requestId: string, projectId: string): EditorOutMessage {
  return {
    type: 'editor.workspace.candidate.ready',
    requestId,
    projectId,
    sessionId: 'session-1',
    candidateId: 'candidate-1',
    baseWorkspaceHash: 'hash-1',
    candidateWorkspaceHash: 'hash-2',
    workspace: {},
    code: 'new()',
    blockCount: 2,
  };
}

const connection = {
  profile: { id: 'test', baseUrl: 'https://example.com', model: 'model' },
  apiKey: 'key',
};
const generated = {
  assistantMessage: 'generated',
  response: {
    type: 'code' as const,
    message: 'summary',
    python: '_motor.mov_stop()',
    assumptions: [],
    questions: [],
    hardware_config: {},
  },
};

function setupRequest() {
  const calls: EditorInMessage[] = [];
  const deferred = new Map<
    string,
    {
      resolve: (value: EditorOutMessage) => void;
      reject: (error: Error) => void;
    }
  >();
  const request = jest.fn((message: EditorInMessage) => {
    calls.push(message);
    if (!('requestId' in message))
      return Promise.reject(new Error('missing id'));
    return new Promise<EditorOutMessage>((resolve, reject) =>
      deferred.set(message.requestId, { resolve, reject }),
    );
  });
  return { calls, deferred, request };
}

describe('AssistantPanel regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() });
    getAssistantConnection.mockResolvedValue(connection);
    generateAssistantCode.mockResolvedValue(generated);
    compileGeneratedCode.mockResolvedValue({
      ok: true,
      bytecodeSize: 12,
      message: '',
      bytecodePath: '/cache/output.o',
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('disables close while applying, scopes discard, and explains automatic save/checkpoint editing', async () => {
    const { calls, deferred, request } = setupRequest();
    const onClose = jest.fn();
    const props = { projectId: 'project-1', request, onClose };
    let onStateChange: ((state: AppStateStatus) => void) | undefined;
    const subscription = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        onStateChange = listener;
        return { remove: jest.fn() };
      });
    const renderer = renderPanel(props);
    await act(async () => {
      findInput(renderer).props.onChangeText('make it move');
    });
    await act(async () => {
      findButton(renderer, '发送给积木助手')!.props.onPress();
    });
    const snapshot = calls.find(
      message => message.type === 'editor.workspace.snapshot.request',
    )!;
    await act(async () => {
      deferred
        .get(snapshot.requestId)!
        .resolve(snapshotResponse(snapshot.requestId, 'project-1'));
    });
    const prepare = calls.find(
      message => message.type === 'editor.workspace.candidate.prepare',
    )!;
    await act(async () => {
      deferred
        .get(prepare.requestId)!
        .resolve(readyResponse(prepare.requestId, 'project-1'));
    });
    await act(async () => undefined);
    expect(ReactNativeBlobUtil.fs.unlink).toHaveBeenCalledWith(
      '/cache/assistant-project-1-candidate-1.py.o',
    );

    const close = findButton(renderer, '关闭积木助手');
    expect(close?.props.disabled).toBe(false);
    const apply = findButton(renderer, '接受并应用候选修改');
    await act(async () => {
      apply!.props.onPress();
      apply!.props.onPress();
    });
    expect(
      calls.filter(
        message => message.type === 'editor.workspace.candidate.apply',
      ),
    ).toHaveLength(1);
    await act(async () => {
      onStateChange?.('background');
    });
    expect(findButton(renderer, '关闭积木助手')?.props.disabled).toBe(true);
    const applyMessage = calls.find(
      message => message.type === 'editor.workspace.candidate.apply',
    )!;
    await act(async () => {
      deferred.get(applyMessage.requestId)!.resolve({
        type: 'editor.workspace.candidate.applied',
        requestId: applyMessage.requestId,
        projectId: 'project-1',
        workspaceHash: 'hash-2',
        code: 'new()',
        blockCount: 2,
      });
    });
    expect(
      findText(
        renderer,
        '候选已应用，并已安排自动保存；保存失败会在编辑器提示。应用会清空原撤销历史，请用检查点恢复。继续人工编辑后，恢复将被拒绝以保护后续修改。',
      ),
    ).toBe(true);
    expect(findButton(renderer, '恢复应用前检查点')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => {
      renderer.update(<AssistantPanel {...props} visible={false} />);
    });
    await act(async () => {
      renderer.update(<AssistantPanel {...props} visible />);
    });
    expect(findButton(renderer, '恢复应用前检查点')).toBeTruthy();
    await act(async () => {
      renderer.update(
        <AssistantPanel {...props} visible persistenceError="自动保存失败" />,
      );
    });
    expect(
      renderer.root
        .findAllByType('View' as never)
        .filter(node => node.props.accessibilityRole === 'alert'),
    ).toHaveLength(1);
    expect(findButton(renderer, '恢复应用前检查点')?.props.disabled).toBe(
      false,
    );
    await act(async () => {
      renderer.unmount();
    });
    subscription.mockRestore();
  });

  it('sends session and candidate IDs when discarding a late candidate', async () => {
    const { calls, deferred, request } = setupRequest();
    const renderer = renderPanel({
      projectId: 'project-1',
      request,
      onClose: jest.fn(),
    });
    await act(async () => {
      findInput(renderer).props.onChangeText('prompt');
    });
    await act(async () => {
      findButton(renderer, '发送给积木助手')!.props.onPress();
    });
    const snapshot = calls.find(
      message => message.type === 'editor.workspace.snapshot.request',
    )!;
    await act(async () => {
      deferred
        .get(snapshot.requestId)!
        .resolve(snapshotResponse(snapshot.requestId, 'project-1'));
    });
    const prepare = calls.find(
      message => message.type === 'editor.workspace.candidate.prepare',
    )!;
    await act(async () => {
      findButton(renderer, '取消')!.props.onPress();
    });
    await act(async () => {
      deferred
        .get(prepare.requestId)!
        .resolve(readyResponse(prepare.requestId, 'project-1'));
    });
    const discard = calls.find(
      message => message.type === 'editor.workspace.candidate.discard',
    );
    expect(discard).toMatchObject({
      sessionId: 'session-1',
      candidateId: 'candidate-1',
    });
    expect(compileGeneratedCode).not.toHaveBeenCalled();
    await act(async () => {
      renderer.unmount();
    });
  });

  it('keeps recovery after a lost apply acknowledgement and clears the stale candidate after restore', async () => {
    const { calls, deferred, request } = setupRequest();
    const renderer = renderPanel({
      projectId: 'project-1',
      request,
      onClose: jest.fn(),
    });
    await act(async () => {
      findInput(renderer).props.onChangeText('prompt');
    });
    await act(async () => {
      findButton(renderer, '发送给积木助手')!.props.onPress();
    });
    const snap = calls.find(
      m => m.type === 'editor.workspace.snapshot.request',
    )!;
    await act(async () => {
      deferred
        .get(snap.requestId)!
        .resolve(snapshotResponse(snap.requestId, 'project-1'));
    });
    const prepare = calls.find(
      m => m.type === 'editor.workspace.candidate.prepare',
    )!;
    await act(async () => {
      deferred
        .get(prepare.requestId)!
        .resolve(readyResponse(prepare.requestId, 'project-1'));
    });
    await act(async () => {
      findButton(renderer, '接受并应用候选修改')!.props.onPress();
    });
    const apply = calls.find(
      m => m.type === 'editor.workspace.candidate.apply',
    )!;
    await act(async () => {
      deferred.get(apply.requestId)!.reject(new Error('编辑器响应超时'));
    });
    expect(findButton(renderer, '恢复应用前检查点')).toBeTruthy();
    await act(async () => {
      findButton(renderer, '恢复应用前检查点')!.props.onPress();
    });
    const restore = calls.find(
      m => m.type === 'editor.workspace.candidate.restore',
    )!;
    await act(async () => {
      deferred.get(restore.requestId)!.resolve({
        type: 'editor.workspace.candidate.applied',
        requestId: restore.requestId,
        projectId: 'project-1',
        workspaceHash: 'hash-1',
        code: 'old()',
        blockCount: 1,
      });
    });
    expect(findButton(renderer, '恢复应用前检查点')).toBeUndefined();
    expect(findButton(renderer, '接受并应用候选修改')).toBeUndefined();
    expect(findInput(renderer).props.editable).toBe(true);
    await act(async () => {
      renderer.unmount();
    });
  });

  it.each(['电机与等待示例', '全部 11 类积木'])(
    'previews %s without credentials or model calls and still requires confirmation',
    async label => {
      getAssistantConnection.mockResolvedValue(null);
      const { calls, deferred, request } = setupRequest();
      const renderer = renderPanel({
        projectId: 'project-1',
        request,
        onClose: jest.fn(),
      });
      await act(async () => {
        findInput(renderer).props.onChangeText('保留草稿');
      });
      await act(async () => {
        findButton(renderer, `运行${label}`)!.props.onPress();
        findButton(renderer, `运行${label}`)!.props.onPress();
      });
      expect(calls).toHaveLength(1);
      const snapshot = calls.find(
        m => m.type === 'editor.workspace.snapshot.request',
      )!;
      await act(async () => {
        deferred
          .get(snapshot.requestId)!
          .resolve(snapshotResponse(snapshot.requestId, 'project-1'));
      });
      const prepare = calls.find(
        m => m.type === 'editor.workspace.candidate.prepare',
      )!;
      expect(prepare).toMatchObject({
        sessionId: 'session-1',
        baseWorkspaceHash: 'hash-1',
        source: { kind: 'python', python: expect.stringContaining('_motor') },
      });
      await act(async () => {
        deferred
          .get(prepare.requestId)!
          .resolve(readyResponse(prepare.requestId, 'project-1'));
      });
      expect(getAssistantConnection).not.toHaveBeenCalled();
      expect(generateAssistantCode).not.toHaveBeenCalled();
      expect(compileGeneratedCode).toHaveBeenCalledWith(
        'new()',
        '/cache/assistant-project-1-candidate-1.py.o',
      );
      expect(
        calls.some(m => m.type === 'editor.workspace.candidate.apply'),
      ).toBe(false);
      expect(findButton(renderer, '接受并应用候选修改')?.props.disabled).toBe(
        false,
      );
      expect(findButton(renderer, `运行${label}`)?.props.disabled).toBe(true);
      expect(findInput(renderer).props.value).toBe('保留草稿');
      await act(async () => {
        findButton(renderer, '拒绝候选修改')!.props.onPress();
      });
      expect(calls.at(-1)).toMatchObject({
        type: 'editor.workspace.candidate.discard',
        candidateId: 'candidate-1',
        sessionId: 'session-1',
      });
      await act(async () => {
        renderer.unmount();
      });
    },
  );

  it('prepares a loop example without calling the model', async () => {
    const { calls, deferred, request } = setupRequest();
    const renderer = renderPanel({
      projectId: 'project-1',
      request,
      onClose: jest.fn(),
    });
    await act(async () => {
      findButton(renderer, '运行循环与变量示例')!.props.onPress();
    });
    const snapshot = calls.find(
      m => m.type === 'editor.workspace.snapshot.request',
    )!;
    await act(async () => {
      deferred
        .get(snapshot.requestId)!
        .resolve(snapshotResponse(snapshot.requestId, 'project-1'));
    });
    const prepare = calls.find(
      m => m.type === 'editor.workspace.candidate.prepare',
    )!;
    expect(prepare).toMatchObject({
      source: { kind: 'python', python: expect.stringContaining('while not') },
    });
    expect(generateAssistantCode).not.toHaveBeenCalled();
    await act(async () => {
      deferred.get(
        (
          prepare as Extract<
            typeof prepare,
            { requestId: string }
          >
        ).requestId,
      )!.resolve({
        type: 'editor.workspace.candidate.rejected',
        requestId: (prepare as { requestId: string }).requestId,
        projectId: 'project-1',
        reason: 'stop',
      });
    });
    await act(async () => {
      renderer.unmount();
    });
  });

  it('does not expose development examples in release mode', () => {
    const development = __DEV__;
    try {
      Reflect.set(globalThis, '__DEV__', false);
      const renderer = renderPanel({
        projectId: 'project-1',
        request: jest.fn(),
        onClose: jest.fn(),
      });
      expect(findButton(renderer, '运行电机与等待示例')).toBeUndefined();
      act(() => {
        renderer.unmount();
      });
    } finally {
      Reflect.set(globalThis, '__DEV__', development);
    }
  });

  it('clears output even when compilation rejects', async () => {
    compileGeneratedCode.mockRejectedValue(new Error('compile failed'));
    const { calls, deferred, request } = setupRequest();
    const renderer = renderPanel({
      projectId: 'project-1',
      request,
      onClose: jest.fn(),
    });
    await act(async () => {
      findInput(renderer).props.onChangeText('prompt');
    });
    await act(async () => {
      findButton(renderer, '发送给积木助手')!.props.onPress();
    });
    const snapshot = calls.find(
      message => message.type === 'editor.workspace.snapshot.request',
    )!;
    await act(async () => {
      deferred
        .get(snapshot.requestId)!
        .resolve(snapshotResponse(snapshot.requestId, 'project-1'));
    });
    const prepare = calls.find(
      message => message.type === 'editor.workspace.candidate.prepare',
    )!;
    await act(async () => {
      deferred
        .get(prepare.requestId)!
        .resolve(readyResponse(prepare.requestId, 'project-1'));
    });
    await act(async () => undefined);
    expect(ReactNativeBlobUtil.fs.unlink).toHaveBeenCalledWith(
      '/cache/assistant-project-1-candidate-1.py.o',
    );
    expect(findButton(renderer, '接受并应用候选修改')?.props.disabled).toBe(
      true,
    );
    await act(async () => {
      renderer.unmount();
    });
  });
});
