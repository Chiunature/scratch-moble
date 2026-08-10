import * as ScratchBlocks from 'scratch-blocks';

import { createWorkspaceHistory } from '../src/bridge/workspaceHistory';
import type { Workspace } from '../src/codegen/types';
import {
  setupWorkspaceFloatingControls,
  updateWorkspaceFloatingHistoryState,
  type WorkspaceFloatingControlHandlers,
} from '../src/workspace-custom/controls';

jest.mock('scratch-blocks', () => ({
  hideChaff: jest.fn(),
}));

jest.mock('../src/workspace-custom/controls', () => ({
  setupWorkspaceFloatingControls: jest.fn(),
  updateWorkspaceFloatingHistoryState: jest.fn(),
}));

const mockSetupControls = setupWorkspaceFloatingControls as jest.MockedFunction<
  typeof setupWorkspaceFloatingControls
>;
const mockUpdateHistory = updateWorkspaceFloatingHistoryState as jest.MockedFunction<
  typeof updateWorkspaceFloatingHistoryState
>;
const hideChaff = ScratchBlocks as unknown as { hideChaff: jest.Mock };

type HistoryWorkspace = Workspace & {
  getUndoStack?: () => unknown[];
  getRedoStack?: () => unknown[];
  undo?: jest.Mock<(redo: boolean) => void>;
  clearUndo?: jest.Mock;
};

/**
 * 有状态 workspace：undo 把栈顶移入 redo 栈、clearUndo 清空 undo 栈，
 * 与 Blockly 行为一致，便于断言 undo 后的 history 状态。
 */
function makeWorkspace(undoCount = 0, redoCount = 0): HistoryWorkspace {
  const undoStack = Array.from({ length: undoCount }, (_, i) => ({ i }));
  const redoStack = Array.from({ length: redoCount }, (_, i) => ({ i }));
  return {
    getUndoStack: () => undoStack,
    getRedoStack: () => redoStack,
    undo: jest.fn((redo: boolean) => {
      if (redo) {
        const item = redoStack.pop();
        if (item != null) undoStack.push(item);
      } else {
        const item = undoStack.pop();
        if (item != null) redoStack.push(item);
      }
    }),
    clearUndo: jest.fn(() => {
      undoStack.length = 0;
    }),
  };
}

function lastHandlers(): WorkspaceFloatingControlHandlers {
  return mockSetupControls.mock.calls.at(-1)?.[1] as WorkspaceFloatingControlHandlers;
}

describe('createWorkspaceHistory', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('初始化时注册浮动控件并发布初始 history 状态', () => {
    const workspace = makeWorkspace(1);
    createWorkspaceHistory(workspace, { onCodeGenerationNeeded: jest.fn() });

    expect(mockSetupControls).toHaveBeenCalledWith(
      workspace,
      expect.objectContaining({
        onUndo: expect.any(Function),
        onRedo: expect.any(Function),
      }),
    );
    expect(mockUpdateHistory).toHaveBeenLastCalledWith({ canUndo: true, canRedo: false });
  });

  it('schedulePublish 合并 0ms 定时器，重复调用只发布一次', () => {
    const workspace = makeWorkspace();
    const history = createWorkspaceHistory(workspace, {
      onCodeGenerationNeeded: jest.fn(),
    });
    mockUpdateHistory.mockClear();

    history.schedulePublish();
    history.schedulePublish();
    history.schedulePublish();
    expect(mockUpdateHistory).not.toHaveBeenCalled();

    jest.advanceTimersByTime(0);
    expect(mockUpdateHistory).toHaveBeenCalledTimes(1);
  });

  it('undo 回调：无 undo 栈时不执行', () => {
    const workspace = makeWorkspace();
    (workspace as { undo?: unknown }).undo = undefined;
    createWorkspaceHistory(workspace, { onCodeGenerationNeeded: jest.fn() });

    const { onUndo } = lastHandlers();
    onUndo();

    expect(mockUpdateHistory).toHaveBeenCalled();
  });

  it('undo 回调：可撤销时执行 undo、触发 codegen 并发布状态', () => {
    const workspace = makeWorkspace(1);
    const onCodeGenerationNeeded = jest.fn();
    const history = createWorkspaceHistory(workspace, { onCodeGenerationNeeded });
    mockUpdateHistory.mockClear();

    const { onUndo } = lastHandlers();
    onUndo();

    expect(workspace.undo).toHaveBeenCalledWith(false);
    expect(onCodeGenerationNeeded).toHaveBeenCalledTimes(1);
    expect(hideChaff.hideChaff).toHaveBeenCalled();
    // undo 后原项进入 redo 栈：可撤销=false、可重做=true
    expect(mockUpdateHistory).toHaveBeenLastCalledWith({ canUndo: false, canRedo: true });
  });

  it('redo 回调：无重做栈时只发布状态不执行 undo', () => {
    const workspace = makeWorkspace();
    createWorkspaceHistory(workspace, { onCodeGenerationNeeded: jest.fn() });
    mockUpdateHistory.mockClear();

    const { onRedo } = lastHandlers();
    onRedo();

    expect(workspace.undo).not.toHaveBeenCalled();
    expect(mockUpdateHistory).toHaveBeenCalled();
  });

  it('redo 回调：可重做时执行 undo(true)', () => {
    const workspace = makeWorkspace(0, 1);
    const onCodeGenerationNeeded = jest.fn();
    createWorkspaceHistory(workspace, { onCodeGenerationNeeded });
    mockUpdateHistory.mockClear();

    const { onRedo } = lastHandlers();
    onRedo();

    expect(workspace.undo).toHaveBeenCalledWith(true);
    expect(onCodeGenerationNeeded).toHaveBeenCalledTimes(1);
  });

  it('clear 清空 undo 栈并强制发布', () => {
    const workspace = makeWorkspace(1);
    const history = createWorkspaceHistory(workspace, {
      onCodeGenerationNeeded: jest.fn(),
    });
    mockUpdateHistory.mockClear();

    history.clear();

    expect(workspace.clearUndo).toHaveBeenCalledTimes(1);
    expect(mockUpdateHistory).toHaveBeenLastCalledWith({ canUndo: false, canRedo: false });
  });

  it('dispose 取消挂起的定时器，不再发布', () => {
    const workspace = makeWorkspace();
    const history = createWorkspaceHistory(workspace, {
      onCodeGenerationNeeded: jest.fn(),
    });
    mockUpdateHistory.mockClear();

    history.schedulePublish();
    history.dispose();

    jest.advanceTimersByTime(0);
    expect(mockUpdateHistory).not.toHaveBeenCalled();
  });
});