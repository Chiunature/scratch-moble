import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AiSettingsScreen } from '../src/screens/AiSettingsScreen';

jest.mock('../src/services/assistant', () => ({
  activateAssistantConnection: jest.fn(),
  deleteAssistantConnection: jest.fn(),
  generateAssistantProposal: jest.fn(),
  isAssistantSecureStorageAvailable: jest.fn(() => false),
  listAssistantConnections: jest.fn(),
  normalizeAssistantBaseUrl: jest.requireActual(
    '../src/services/assistant/openAiCompatible',
  ).normalizeAssistantBaseUrl,
  saveAssistantConnection: jest.fn(),
}));

const service = jest.requireMock('../src/services/assistant') as Record<
  string,
  jest.Mock
>;
const connection = {
  profile: {
    id: 'test',
    baseUrl: 'https://example.com/v1',
    model: 'test-model',
  },
  apiKey: 'test-credential',
};

const navigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  setOptions: jest.fn(),
} as never;
const route = { key: 'AiSettings', name: 'AiSettings', params: undefined } as never;

let renderer: TestRenderer.ReactTestRenderer;
let onStateChange: (state: AppStateStatus) => void;
const button = (label: string) =>
  renderer.root.findAllByProps({ accessibilityLabel: label })[0];
const input = (placeholder: string) =>
  renderer.root.findAllByProps({ placeholder })[0];
const alertMock = () => Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const confirmation = () => alertMock().mock.calls.at(-1)![2]![1].onPress!;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function mount() {
  await act(async () => {
    renderer = TestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <AiSettingsScreen navigation={navigation} route={route} />
      </SafeAreaProvider>,
    );
  });
}

async function openEditor() {
  await act(async () => {
    button('编辑 test-model').props.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  service.listAssistantConnections.mockResolvedValue([
    { ...connection, persisted: false, active: true },
  ]);
  service.saveAssistantConnection.mockResolvedValue(undefined);
  service.deleteAssistantConnection.mockResolvedValue(undefined);
  service.activateAssistantConnection.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      onStateChange = listener;
      return { remove: jest.fn() };
    });
});

afterEach(async () => {
  if (renderer)
    await act(async () => {
      renderer.unmount();
    });
  jest.restoreAllMocks();
});

it('masks credentials, clears them on endpoint change and supports confirmed session saving without native storage', async () => {
  await mount();
  await openEditor();
  expect(input('仅用于请求，不会写入日志').props.secureTextEntry).toBe(true);
  await act(async () => {
    input('https://api.example.com/v1').props.onChangeText(
      'https://other.example/v1',
    );
  });
  expect(input('仅用于请求，不会写入日志').props.value).toBe('');
  await act(async () => {
    input('仅用于请求，不会写入日志').props.onChangeText('new-test-credential');
  });
  await act(async () => {
    button('保存模型配置').props.onPress();
  });
  expect(service.saveAssistantConnection).not.toHaveBeenCalled();
  expect(alertMock().mock.calls.at(-1)![1]).toContain(
    'https://other.example/v1',
  );
  await act(async () => {
    confirmation()();
  });
  expect(service.saveAssistantConnection).toHaveBeenCalledWith(
    expect.objectContaining({ baseUrl: 'https://other.example/v1' }),
    'new-test-credential',
    false,
  );
});

it.each([
  ['保存模型配置', true],
  ['删除 test-model', false],
  ['测试模型连接', true],
] as const)(
  'invalidates a pending %s confirmation on background',
  async (label, needsEditor) => {
    await mount();
    if (needsEditor) await openEditor();
    await act(async () => {
      button(label).props.onPress();
    });
    const confirm = confirmation();
    await act(async () => {
      onStateChange('background');
      confirm();
    });
    expect(service.saveAssistantConnection).not.toHaveBeenCalled();
    expect(service.deleteAssistantConnection).not.toHaveBeenCalled();
    expect(service.generateAssistantProposal).not.toHaveBeenCalled();
  },
);

it('ignores a previous save confirmation after remount without cancelling the new confirmation', async () => {
  await mount();
  await openEditor();
  await act(async () => {
    button('保存模型配置').props.onPress();
  });
  const oldConfirm = confirmation();
  await act(async () => {
    renderer.unmount();
  });
  await mount();
  await openEditor();
  await act(async () => {
    button('保存模型配置').props.onPress();
  });
  const newConfirm = confirmation();
  await act(async () => {
    oldConfirm();
  });
  expect(service.saveAssistantConnection).not.toHaveBeenCalled();
  await act(async () => {
    newConfirm();
  });
  expect(service.saveAssistantConnection).toHaveBeenCalledTimes(1);
});

it('aborts a running connection test on background and ignores its late response', async () => {
  let finish!: () => void;
  service.generateAssistantProposal.mockImplementation(
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      }),
  );
  await mount();
  await openEditor();
  await act(async () => {
    button('测试模型连接').props.onPress();
  });
  await act(async () => {
    confirmation()();
  });
  const signal = service.generateAssistantProposal.mock.calls[0][0]
    .signal as AbortSignal;
  await act(async () => {
    onStateChange('background');
    finish();
  });
  expect(signal.aborted).toBe(true);
  expect(alertMock().mock.calls.some(call => call[0] === '连接成功')).toBe(
    false,
  );
});
