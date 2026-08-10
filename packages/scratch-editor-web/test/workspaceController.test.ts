import type { EditorInMessage } from '@scratch-mobile/shared';

import { createWorkspaceController } from '../src/bridge/workspaceController';
import type { Workspace } from '../src/codegen/types';
import { handleEditorLocaleInbound } from '../src/bridge/editorLocaleInbound';
import { createCodeGenerationPublisher } from '../src/bridge/codeGenerationPublisher';
import { createWorkspaceHistory } from '../src/bridge/workspaceHistory';
import { createWorkspacePersistence } from '../src/bridge/workspacePersistence';
import { handleNumberSliderInbound } from '../src/workspace-custom/fields/numberSliderEditor';

jest.mock('../src/bridge/editorLocaleInbound', () => ({
  handleEditorLocaleInbound: jest.fn(() => false),
}));

jest.mock('../src/bridge/codeGenerationPublisher', () => ({
  createCodeGenerationPublisher: jest.fn(),
}));

jest.mock('../src/bridge/workspaceHistory', () => ({
  createWorkspaceHistory: jest.fn(),
}));

jest.mock('../src/bridge/workspacePersistence', () => ({
  createWorkspacePersistence: jest.fn(),
}));

jest.mock('../src/workspace-custom/fields/numberSliderEditor', () => ({
  handleNumberSliderInbound: jest.fn(),
}));

jest.mock('../src/workspace-custom/fields/matrixLightEditor', () => ({
  handleMatrixLightInbound: jest.fn(),
}));

jest.mock('../src/workspace-custom/fields/notePickerEditor', () => ({
  handleNotePickerInbound: jest.fn(),
}));

jest.mock('../src/workspace-custom/fields/handleShankPickerEditor', () => ({
  handleHandleShankInbound: jest.fn(),
}));

jest.mock('../src/workspace-custom/variablePromptBridge', () => ({
  handleVariablePromptInbound: jest.fn(),
}));

const mockHandleLocaleInbound = handleEditorLocaleInbound as jest.MockedFunction<
  typeof handleEditorLocaleInbound
>;
const mockCreateCodegen = createCodeGenerationPublisher as jest.MockedFunction<
  typeof createCodeGenerationPublisher
>;
const mockCreateHistory = createWorkspaceHistory as jest.MockedFunction<
  typeof createWorkspaceHistory
>;
const mockCreatePersistence = createWorkspacePersistence as jest.MockedFunction<
  typeof createWorkspacePersistence
>;
const mockHandleNumberSlider = handleNumberSliderInbound as jest.MockedFunction<
  typeof handleNumberSliderInbound
>;

function makeWorkspace(): Workspace & {
  addChangeListener: jest.Mock;
  removeChangeListener: jest.Mock;
} {
  return {
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  } as unknown as Workspace & {
    addChangeListener: jest.Mock;
    removeChangeListener: jest.Mock;
  };
}

describe('createWorkspaceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleLocaleInbound.mockReturnValue(false);
    mockCreateCodegen.mockReturnValue({
      schedule: jest.fn(),
      flush: jest.fn(),
      dispose: jest.fn(),
    });
    mockCreateHistory.mockReturnValue({
      clear: jest.fn(),
      schedulePublish: jest.fn(),
      dispose: jest.fn(),
    });
    mockCreatePersistence.mockReturnValue({
      handleInbound: jest.fn(() => false),
      scheduleChange: jest.fn(),
      dispose: jest.fn(),
    });
  });

  it('为 workspace 注册唯一 change listener，并把一次变更分发到 persistence/codegen/history', () => {
    const workspace = makeWorkspace();
    createWorkspaceController(workspace);

    expect(workspace.addChangeListener).toHaveBeenCalledTimes(1);
    const changeListener = workspace.addChangeListener.mock.calls[0][0] as () => void;
    changeListener();

    expect(mockCreatePersistence.mock.results[0].value.scheduleChange).toHaveBeenCalledTimes(1);
    expect(mockCreateCodegen.mock.results[0].value.schedule).toHaveBeenCalledTimes(1);
    expect(mockCreateHistory.mock.results[0].value.schedulePublish).toHaveBeenCalledTimes(1);
  });

  it('load 完成后清空 history 并刷新 codegen', () => {
    const workspace = makeWorkspace();
    createWorkspaceController(workspace);

    const onWorkspaceLoaded = mockCreatePersistence.mock.calls[0][1].onWorkspaceLoaded;
    onWorkspaceLoaded();

    expect(mockCreateHistory.mock.results[0].value.clear).toHaveBeenCalledTimes(1);
    expect(mockCreateCodegen.mock.results[0].value.flush).toHaveBeenCalledTimes(1);
  });

  it('inbound 优先由 locale/persistence 处理，未处理时再路由到字段桥', () => {
    const workspace = makeWorkspace();
    const controller = createWorkspaceController(workspace);
    const sliderMessage = {
      type: 'editor.numberSlider.value',
      sessionId: 's1',
      value: 1,
    } as EditorInMessage;

    mockHandleLocaleInbound.mockReturnValueOnce(true);
    controller.handleMessageFromNative(sliderMessage);
    expect(mockHandleNumberSlider).not.toHaveBeenCalled();

    mockHandleLocaleInbound.mockReturnValueOnce(false);
    mockCreatePersistence.mock.results[0].value.handleInbound.mockReturnValueOnce(true);
    controller.handleMessageFromNative(sliderMessage);
    expect(mockHandleNumberSlider).not.toHaveBeenCalled();

    mockHandleLocaleInbound.mockReturnValueOnce(false);
    mockCreatePersistence.mock.results[0].value.handleInbound.mockReturnValueOnce(false);
    controller.handleMessageFromNative(sliderMessage);
    expect(mockHandleNumberSlider).toHaveBeenCalledWith(sliderMessage);
  });

  it('flushCodeGeneration 与 dispose 代理到底层模块，并释放 change listener', () => {
    const workspace = makeWorkspace();
    const controller = createWorkspaceController(workspace);
    const changeListener = workspace.addChangeListener.mock.calls[0][0];

    controller.flushCodeGeneration();
    controller.dispose();

    expect(mockCreateCodegen.mock.results[0].value.flush).toHaveBeenCalledTimes(1);
    expect(workspace.removeChangeListener).toHaveBeenCalledWith(changeListener);
    expect(mockCreatePersistence.mock.results[0].value.dispose).toHaveBeenCalledTimes(1);
    expect(mockCreateCodegen.mock.results[0].value.dispose).toHaveBeenCalledTimes(1);
    expect(mockCreateHistory.mock.results[0].value.dispose).toHaveBeenCalledTimes(1);
  });
});