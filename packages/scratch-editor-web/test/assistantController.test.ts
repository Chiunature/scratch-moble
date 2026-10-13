import type { EditorOutMessage } from '@scratch-mobile/shared';
import type { Workspace } from '../src/codegen/types';

let mockFailLoads = 0;

jest.mock('scratch-blocks', () => {
  class FakeWorkspace {
    state = { blocks: { languageVersion: 0, blocks: [] as unknown[] } };

    getAllBlocks() {
      const result: unknown[] = [];
      const visit = (block: any): void => {
        result.push(block);
        Object.values(block.inputs ?? {}).forEach((input: any) => {
          if (input.block) visit(input.block);
          else if (input.shadow) visit(input.shadow);
        });
        if (block.next?.block) visit(block.next.block);
      };
      this.state.blocks.blocks.forEach(visit);
      return result;
    }

    dispose() {}
  }

  let uid = 0;
  return {
    Events: { disable: jest.fn(), enable: jest.fn() },
    Workspace: FakeWorkspace,
    serialization: {
      workspaces: {
        save: (workspace: FakeWorkspace) => workspace.state,
        load: (state: FakeWorkspace['state'], workspace: FakeWorkspace) => {
          if (mockFailLoads > 0) {
            mockFailLoads -= 1;
            // Scratch load clears the live workspace before it may throw.
            workspace.state = { blocks: { languageVersion: 0, blocks: [] } };
            throw new Error('模拟工作区加载失败');
          }
          workspace.state = state;
        },
      },
    },
    utils: { idGenerator: { genUid: () => `uid-${++uid}` } },
  };
});

jest.mock('../src/blocks/portDropdownExtensions', () => ({
  COLOURS_FROM_PARENT_BLOCK_TYPES: new Set(),
  refreshColoursFromParentInWorkspace: jest.fn(),
}));

jest.mock('../src/codegen/generators', () => ({
  renderPythonCode: jest.fn(
    (workspace: { state: unknown }) =>
      `python:${JSON.stringify(workspace.state)}`,
  ),
}));

import { createAssistantController } from '../src/assistant/controller';
import { refreshColoursFromParentInWorkspace } from '../src/blocks/portDropdownExtensions';
import { stableWorkspaceJson } from '../src/assistant/candidate';
import { ASSISTANT_CAPABILITY_CATALOG_VERSION } from '@scratch-mobile/assistant-contracts';

const proposal = {
  schemaVersion: 1 as const,
  intent: 'modify' as const,
  summary: '追加停止',
  operations: [
    {
      kind: 'appendToMainScript' as const,
      statements: [{ kind: 'move.stop' as const }],
    },
  ],
};

type FakeWorkspace = Workspace & { state: any };

function makeWorkspace(): FakeWorkspace {
  return {
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            id: 'unknown-root',
            type: 'future_block',
            x: 10,
            y: 20,
            mutation: { value: 'keep' },
          },
          {
            id: 'hat',
            type: 'event_when_flag_clicked',
            next: {
              block: {
                id: 'existing-stop',
                type: 'mov_stop',
                customMetadata: { keep: true },
              },
            },
          },
        ],
      },
    },
    getAllBlocks: jest.fn(() => []),
  } as unknown as FakeWorkspace;
}

function createHarness(projectId = 'project-1') {
  const workspace = makeWorkspace();
  let currentProjectId: string | null = projectId;
  const posted: EditorOutMessage[] = [];
  const onApplied = jest.fn();
  const controller = createAssistantController(workspace, {
    post: message => posted.push(message),
    getProjectId: () => currentProjectId,
    onApplied,
  });
  return {
    workspace,
    posted,
    controller,
    onApplied,
    setProject: (id: string | null) => {
      currentProjectId = id;
    },
  };
}

function snapshot(harness: ReturnType<typeof createHarness>) {
  harness.controller.handleInbound({
    type: 'editor.workspace.snapshot.request',
    requestId: 'snapshot-1',
    projectId: 'project-1',
  });
  const message = harness.posted.at(-1);
  expect(message?.type).toBe('editor.workspace.snapshot');
  return message as Extract<
    EditorOutMessage,
    { type: 'editor.workspace.snapshot' }
  >;
}

function prepare(harness: ReturnType<typeof createHarness>, sessionId: string) {
  harness.controller.handleInbound({
    type: 'editor.workspace.candidate.prepare',
    requestId: 'prepare-1',
    projectId: 'project-1',
    sessionId,
    catalogVersion: ASSISTANT_CAPABILITY_CATALOG_VERSION,
    baseWorkspaceHash: (harness.posted[0] as any).workspaceHash,
    proposal,
  });
  const message = harness.posted.at(-1);
  expect(message?.type).toBe('editor.workspace.candidate.ready');
  return message as Extract<
    EditorOutMessage,
    { type: 'editor.workspace.candidate.ready' }
  >;
}

describe('createAssistantController', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockFailLoads = 0;
    jest.mocked(refreshColoursFromParentInWorkspace).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([false, true])(
    'refreshes colours only for rendered workspaces',
    rendered => {
      const h = createHarness();
      h.workspace.rendered = rendered;
      const snap = snapshot(h);
      const ready = prepare(h, snap.sessionId);
      h.controller.handleInbound({
        type: 'editor.workspace.candidate.apply',
        requestId: 'apply-colour',
        projectId: 'project-1',
        sessionId: snap.sessionId,
        candidateId: ready.candidateId,
      });
      expect(refreshColoursFromParentInWorkspace).toHaveBeenCalledTimes(rendered ? 1 : 0);
      expect(h.posted.at(-1)?.type).toBe('editor.workspace.candidate.applied');
    },
  );

  it('keeps an applied candidate when colour refresh fails', () => {
    const h = createHarness();
    h.workspace.rendered = true;
    jest.mocked(refreshColoursFromParentInWorkspace).mockImplementationOnce(() => {
      throw new Error('render failed');
    });
    const snap = snapshot(h);
    const ready = prepare(h, snap.sessionId);
    h.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-colour',
      projectId: 'project-1',
      sessionId: snap.sessionId,
      candidateId: ready.candidateId,
    });
    expect(h.posted.at(-1)?.type).toBe('editor.workspace.candidate.applied');
  });

  it('prepares in isolation, preserves unknown blocks, and changes the original only on apply', () => {
    const harness = createHarness();
    const originalJson = stableWorkspaceJson(harness.workspace.state);
    const snap = snapshot(harness);
    const ready = prepare(harness, snap.sessionId);

    expect(stableWorkspaceJson(harness.workspace.state)).toBe(originalJson);
    expect((ready.workspace as any).blocks.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'unknown-root',
          type: 'future_block',
          mutation: { value: 'keep' },
        }),
      ]),
    );

    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-1',
      projectId: 'project-1',
      sessionId: snap.sessionId,
      candidateId: ready.candidateId,
    });

    expect(stableWorkspaceJson(harness.workspace.state)).not.toBe(originalJson);
    expect(harness.posted.at(-1)?.type).toBe(
      'editor.workspace.candidate.applied',
    );
  });

  it('ignores a late discard for an older candidate', () => {
    const h = createHarness();
    const first = prepare(h, snapshot(h).sessionId);
    const second = prepare(h, snapshot(h).sessionId);
    h.controller.handleInbound({
      type: 'editor.workspace.candidate.discard',
      requestId: 'discard-old',
      projectId: 'project-1',
      sessionId: first.sessionId,
      candidateId: first.candidateId,
    });
    h.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-new',
      projectId: 'project-1',
      sessionId: second.sessionId,
      candidateId: second.candidateId,
    });
    expect(h.posted.at(-1)?.type).toBe('editor.workspace.candidate.applied');
  });

  it('rolls back when application notification fails', () => {
    const h = createHarness();
    const before = stableWorkspaceJson(h.workspace.state);
    const ready = prepare(h, snapshot(h).sessionId);
    h.onApplied.mockImplementationOnce(() => {
      throw new Error('save scheduling failed');
    });
    h.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-failed',
      projectId: 'project-1',
      sessionId: ready.sessionId,
      candidateId: ready.candidateId,
    });
    expect(h.posted.at(-1)?.type).toBe('editor.workspace.candidate.rejected');
    expect(stableWorkspaceJson(h.workspace.state)).toBe(before);
  });

  it.each(['apply', 'restore'] as const)(
    'retains a retryable backup if %s and rollback both destroy the workspace',
    action => {
      const h = createHarness();
      const before = stableWorkspaceJson(h.workspace.state);
      const ready = prepare(h, snapshot(h).sessionId);
      const apply = () =>
        h.controller.handleInbound({
          type: 'editor.workspace.candidate.apply',
          requestId: 'apply',
          projectId: 'project-1',
          sessionId: ready.sessionId,
          candidateId: ready.candidateId,
        });
      const restore = () =>
        h.controller.handleInbound({
          type: 'editor.workspace.candidate.restore',
          requestId: 'restore',
          projectId: 'project-1',
          sessionId: ready.sessionId,
        });
      if (action === 'restore') apply();
      mockFailLoads = 2;
      if (action === 'apply') apply();
      else restore();
      expect(h.posted.at(-1)).toMatchObject({
        type: 'editor.workspace.candidate.rejected',
        reason: expect.stringContaining('备份已保留'),
      });
      expect(stableWorkspaceJson(h.workspace.state)).not.toBe(before);
      h.controller.handleInbound({
        type: 'editor.workspace.snapshot.request',
        requestId: 'blocked',
        projectId: 'project-1',
      });
      expect(h.posted.at(-1)).toMatchObject({
        type: 'editor.workspace.candidate.rejected',
        reason: expect.stringContaining('先使用检查点恢复'),
      });
      restore();
      expect(h.posted.at(-1)?.type).toBe('editor.workspace.candidate.applied');
      expect(stableWorkspaceJson(h.workspace.state)).toBe(before);
    },
  );

  it('protects edits made after failed rollback instead of overwriting them on recovery', () => {
    const h = createHarness();
    const ready = prepare(h, snapshot(h).sessionId);
    mockFailLoads = 2;
    h.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply',
      projectId: 'project-1',
      sessionId: ready.sessionId,
      candidateId: ready.candidateId,
    });
    h.workspace.state.blocks.blocks.push({ id: 'new-edit', type: 'mov_stop' });
    const edited = stableWorkspaceJson(h.workspace.state);
    h.controller.handleInbound({
      type: 'editor.workspace.candidate.restore',
      requestId: 'restore',
      projectId: 'project-1',
      sessionId: ready.sessionId,
    });
    expect(h.posted.at(-1)?.type).toBe('editor.workspace.candidate.rejected');
    expect(stableWorkspaceJson(h.workspace.state)).toBe(edited);
  });

  it('rejects expired candidates without changing the original workspace', () => {
    jest.useFakeTimers();
    const harness = createHarness();
    const snap = snapshot(harness);
    const ready = prepare(harness, snap.sessionId);
    const before = stableWorkspaceJson(harness.workspace.state);
    jest.advanceTimersByTime(10 * 60 * 1000 + 1);

    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-1',
      projectId: 'project-1',
      sessionId: snap.sessionId,
      candidateId: ready.candidateId,
    });

    expect(harness.posted.at(-1)).toEqual(
      expect.objectContaining({
        type: 'editor.workspace.candidate.rejected',
        reason: '候选已过期，请重新生成。',
      }),
    );
    expect(stableWorkspaceJson(harness.workspace.state)).toBe(before);
  });

  it('rejects project and session mismatches before applying a candidate', () => {
    const harness = createHarness();
    const snap = snapshot(harness);
    const ready = prepare(harness, snap.sessionId);
    const before = stableWorkspaceJson(harness.workspace.state);

    harness.setProject('project-2');
    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-1',
      projectId: 'project-1',
      sessionId: snap.sessionId,
      candidateId: ready.candidateId,
    });
    expect(harness.posted.at(-1)).toEqual(
      expect.objectContaining({ type: 'editor.workspace.candidate.rejected' }),
    );
    expect(stableWorkspaceJson(harness.workspace.state)).toBe(before);

    harness.setProject('project-1');
    harness.controller.reset();
    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-2',
      projectId: 'project-1',
      sessionId: snap.sessionId,
      candidateId: ready.candidateId,
    });
    expect(harness.posted.at(-1)).toEqual(
      expect.objectContaining({ type: 'editor.workspace.candidate.rejected' }),
    );
    expect(stableWorkspaceJson(harness.workspace.state)).toBe(before);
  });

  it('rejects duplicate apply and restore after the one-shot checkpoint is consumed', () => {
    const harness = createHarness();
    const snap = snapshot(harness);
    const ready = prepare(harness, snap.sessionId);
    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-1',
      projectId: 'project-1',
      sessionId: snap.sessionId,
      candidateId: ready.candidateId,
    });
    const appliedJson = stableWorkspaceJson(harness.workspace.state);

    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-2',
      projectId: 'project-1',
      sessionId: snap.sessionId,
      candidateId: ready.candidateId,
    });
    expect(harness.posted.at(-1)).toEqual(
      expect.objectContaining({ type: 'editor.workspace.candidate.rejected' }),
    );

    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.restore',
      requestId: 'restore-1',
      projectId: 'project-1',
      sessionId: snap.sessionId,
    });
    expect(stableWorkspaceJson(harness.workspace.state)).not.toBe(appliedJson);
    expect(harness.posted.at(-1)?.type).toBe(
      'editor.workspace.candidate.applied',
    );

    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.restore',
      requestId: 'restore-2',
      projectId: 'project-1',
      sessionId: snap.sessionId,
    });
    expect(harness.posted.at(-1)).toEqual(
      expect.objectContaining({ type: 'editor.workspace.candidate.rejected' }),
    );
  });

  it('rolls back a failed restore and rejects restore after later edits', () => {
    const harness = createHarness();
    const snap = snapshot(harness);
    const ready = prepare(harness, snap.sessionId);
    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.apply',
      requestId: 'apply-1',
      projectId: 'project-1',
      sessionId: snap.sessionId,
      candidateId: ready.candidateId,
    });
    const appliedState = stableWorkspaceJson(harness.workspace.state);

    mockFailLoads = 1;
    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.restore',
      requestId: 'restore-1',
      projectId: 'project-1',
      sessionId: snap.sessionId,
    });
    expect(harness.posted.at(-1)).toEqual(
      expect.objectContaining({ type: 'editor.workspace.candidate.rejected' }),
    );
    expect(stableWorkspaceJson(harness.workspace.state)).toBe(appliedState);

    harness.workspace.state.blocks.blocks.push({
      id: 'manual-edit',
      type: 'future_block',
    });
    harness.controller.handleInbound({
      type: 'editor.workspace.candidate.restore',
      requestId: 'restore-2',
      projectId: 'project-1',
      sessionId: snap.sessionId,
    });
    expect(harness.posted.at(-1)).toEqual(
      expect.objectContaining({ type: 'editor.workspace.candidate.rejected' }),
    );
    expect(stableWorkspaceJson(harness.workspace.state)).not.toBe(appliedState);
  });
});
