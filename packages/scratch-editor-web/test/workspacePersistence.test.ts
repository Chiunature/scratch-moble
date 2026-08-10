import * as ScratchBlocks from 'scratch-blocks';

import type { EditorInMessage } from '@scratch-mobile/shared';
import { postToReactNative } from '../src/bridge';
import { createWorkspacePersistence } from '../src/bridge/workspacePersistence';
import { refreshColoursFromParentInWorkspace } from '../src/blocks/portDropdownExtensions';
import type { Workspace } from '../src/codegen/types';
import { insertStartHatBlockIfMissing } from '../src/workspace-custom/ensureStartHatBlock';

jest.mock('scratch-blocks', () => ({
  Events: {
    disable: jest.fn(),
    enable: jest.fn(),
  },
  serialization: {
    workspaces: {
      load: jest.fn(),
      save: jest.fn(),
    },
  },
}));

jest.mock('../src/bridge', () => ({
  postToReactNative: jest.fn(),
}));

jest.mock('../src/workspace-custom/ensureStartHatBlock', () => ({
  insertStartHatBlockIfMissing: jest.fn(),
}));

jest.mock('../src/blocks/portDropdownExtensions', () => ({
  refreshColoursFromParentInWorkspace: jest.fn(),
}));

type MockWorkspace = Workspace & {
  clear: jest.Mock;
  getAllBlocks: jest.Mock;
  getParentSvg: jest.Mock;
  resize: jest.Mock;
};

const postMessage = postToReactNative as jest.MockedFunction<
  typeof postToReactNative
>;
const insertStartHat = insertStartHatBlockIfMissing as jest.MockedFunction<
  typeof insertStartHatBlockIfMissing
>;
const refreshColours = refreshColoursFromParentInWorkspace as jest.MockedFunction<
  typeof refreshColoursFromParentInWorkspace
>;
const scratch = ScratchBlocks as unknown as {
  Events: {
    disable: jest.Mock;
    enable: jest.Mock;
  };
  serialization: {
    workspaces: {
      load: jest.Mock;
      save: jest.Mock;
    };
  };
};

function makeWorkspace(blocks: unknown[] = []): {
  container: { style: { pointerEvents: string } };
  workspace: MockWorkspace;
} {
  const container = { style: { pointerEvents: '' } };
  const workspace = {
    clear: jest.fn(),
    getAllBlocks: jest.fn(() => blocks),
    getParentSvg: jest.fn(() => ({ parentElement: container })),
    resize: jest.fn(),
  } as unknown as MockWorkspace;
  return { container, workspace };
}

function makeLoadMessage(
  workspace: unknown,
  revision = 0,
): Extract<EditorInMessage, { type: 'editor.workspace.load' }> {
  return {
    type: 'editor.workspace.load',
    projectId: 'project-1',
    revision,
    workspace,
  };
}

function makeFlushMessage(
  projectId = 'project-1',
): Extract<EditorInMessage, { type: 'editor.workspace.flush' }> {
  return {
    type: 'editor.workspace.flush',
    projectId,
  };
}

function latestPostedMessage() {
  return postMessage.mock.calls.at(-1)?.[0];
}

describe('createWorkspacePersistence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    scratch.serialization.workspaces.save.mockReturnValue({
      blocks: { languageVersion: 0, blocks: [] },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('初始化时阻塞工作区交互并通知 RN ready', () => {
    const { container, workspace } = makeWorkspace();

    createWorkspacePersistence(workspace, { onWorkspaceLoaded: jest.fn() });

    expect(container.style.pointerEvents).toBe('none');
    expect(postMessage).toHaveBeenCalledWith({
      type: 'editor.workspace.ready',
    });
  });

  it('load 时禁用事件、清空并加载快照，完成 hydration 后解锁交互', () => {
    const incomingWorkspace = {
      blocks: { languageVersion: 0, blocks: [{ type: 'event_whenflagclicked' }] },
    };
    const { container, workspace } = makeWorkspace([{ type: 'event_whenflagclicked' }]);
    const onWorkspaceLoaded = jest.fn();
    const persistence = createWorkspacePersistence(workspace, { onWorkspaceLoaded });
    postMessage.mockClear();

    const handled = persistence.handleInbound(
      makeLoadMessage(incomingWorkspace, 12),
    );

    expect(handled).toBe(true);
    expect(scratch.Events.disable).toHaveBeenCalledTimes(1);
    expect(workspace.clear).toHaveBeenCalledTimes(1);
    expect(scratch.serialization.workspaces.load).toHaveBeenCalledWith(
      incomingWorkspace,
      workspace,
      { recordUndo: false },
    );
    expect(scratch.Events.enable).toHaveBeenCalledTimes(1);
    expect(insertStartHat).toHaveBeenCalledWith(workspace);
    expect(refreshColours).toHaveBeenCalledWith(workspace);
    expect(workspace.resize).toHaveBeenCalledTimes(1);
    expect(onWorkspaceLoaded).toHaveBeenCalledTimes(1);
    expect(container.style.pointerEvents).toBe('');
    expect(postMessage).toHaveBeenCalledWith({
      type: 'editor.workspace.loaded',
      projectId: 'project-1',
    });
  });

  it('未完成 workspace.load 前不持久化 change，也不响应无项目 flush', () => {
    const { workspace } = makeWorkspace([{ id: 'block-1' }]);
    const persistence = createWorkspacePersistence(workspace, {
      onWorkspaceLoaded: jest.fn(),
    });
    postMessage.mockClear();

    persistence.scheduleChange();
    jest.advanceTimersByTime(1500);
    persistence.handleInbound(makeFlushMessage());

    expect(postMessage).not.toHaveBeenCalled();
    expect(scratch.serialization.workspaces.save).not.toHaveBeenCalled();
  });

  it('load 后按 debounce 合并 change，并从载入 revision 继续递增', () => {
    const savedWorkspace = {
      blocks: { languageVersion: 0, blocks: [{ type: 'motion_movesteps' }] },
    };
    const { workspace } = makeWorkspace([{ id: 'a' }, { id: 'b' }]);
    scratch.serialization.workspaces.save.mockReturnValue(savedWorkspace);
    const persistence = createWorkspacePersistence(workspace, {
      onWorkspaceLoaded: jest.fn(),
    });
    persistence.handleInbound(makeLoadMessage(null, 4));
    postMessage.mockClear();

    persistence.scheduleChange();
    persistence.scheduleChange();
    jest.advanceTimersByTime(1499);
    expect(postMessage).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(latestPostedMessage()).toEqual({
      type: 'editor.workspace.changed',
      projectId: 'project-1',
      workspace: savedWorkspace,
      blockCount: 2,
      revision: 5,
    });
  });

  it('flush 只处理当前 project，并使用当前 revision 做退出兜底保存', () => {
    const { workspace } = makeWorkspace([{ id: 'only-block' }]);
    const persistence = createWorkspacePersistence(workspace, {
      onWorkspaceLoaded: jest.fn(),
    });
    persistence.handleInbound(makeLoadMessage(null, 9));
    postMessage.mockClear();

    persistence.handleInbound(makeFlushMessage('other-project'));
    expect(postMessage).not.toHaveBeenCalled();

    persistence.handleInbound(makeFlushMessage('project-1'));

    expect(latestPostedMessage()).toMatchObject({
      type: 'editor.workspace.changed',
      projectId: 'project-1',
      blockCount: 1,
      revision: 9,
    });
  });

  it('dispose 会释放未触发的 debounce 保存任务', () => {
    const { workspace } = makeWorkspace([{ id: 'block' }]);
    const persistence = createWorkspacePersistence(workspace, {
      onWorkspaceLoaded: jest.fn(),
    });
    persistence.handleInbound(makeLoadMessage(null, 1));
    postMessage.mockClear();

    persistence.scheduleChange();
    persistence.dispose();
    jest.advanceTimersByTime(1500);

    expect(postMessage).not.toHaveBeenCalled();
  });
});