import * as ScratchBlocks from 'scratch-blocks';
import type { EditorInMessage, EditorOutMessage } from '@scratch-mobile/shared';
import {
  ASSISTANT_CAPABILITY_CATALOG_VERSION,
  type AssistantProgramEditScope,
} from '@scratch-mobile/assistant-contracts';
import { renderPythonCode } from '../codegen/generators';
import type { Workspace } from '../codegen/types';
import { refreshColoursFromParentInWorkspace } from '../blocks/portDropdownExtensions';
import { rebuildContinuousFlyout } from '../workspace-custom/dynamicToolbox';
import {
  buildAssistantCandidate,
  buildPythonCandidate,
  cloneWorkspace,
  stableWorkspaceJson,
  stripProcedureDefinitionsFromPython,
  summarizeWorkspace,
  workspaceFingerprint,
  type WorkspaceState,
} from './candidate';
import { isEmptyAssistantPython, normalizeAssistantPython } from '../decompile';
import { patchProcedureReporterBlocks } from '../workspace-custom/procedureDrag/reporterBlocks';

function normalizePythonForScope(
  python: string,
  scope: AssistantProgramEditScope,
): string {
  const source =
    scope === 'main' ? stripProcedureDefinitionsFromPython(python) : python;
  return normalizeAssistantPython(source);
}

let procedureReportersPatched = false;

type Options = {
  post: (message: EditorOutMessage) => void;
  getProjectId: () => string | null;
  onApplied: () => void;
};

type Checkpoint = {
  before: WorkspaceState;
  afterJson: string;
  projectId: string;
  sessionId: string;
};

const CANDIDATE_TTL_MS = 10 * 60 * 1000;

function omitDerivedProcedureInputs(state: WorkspaceState): WorkspaceState {
  const copy = cloneWorkspace(state);
  const derived = new Set([
    'argument_reporter_string_number',
    'argument_reporter_boolean',
  ]);
  const walk = (block: {
    type?: string;
    inputs?: Record<string, { block?: typeof block; shadow?: typeof block }>;
    next?: { block?: typeof block };
  } | undefined) => {
    if (!block) return;
    if (block.type === 'procedures_prototype' && block.inputs) {
      for (const [name, input] of Object.entries(block.inputs)) {
        const child = input?.block ?? input?.shadow;
        if (child?.type && derived.has(child.type)) delete block.inputs[name];
      }
      if (Object.keys(block.inputs).length === 0) delete block.inputs;
    }
    for (const input of Object.values(block.inputs ?? {})) {
      walk(input?.block);
      walk(input?.shadow);
    }
    walk(block.next?.block);
  };
  for (const block of copy.blocks?.blocks ?? []) walk(block);
  return copy;
}

function ensureHeadlessProcedureBlocks(): void {
  const prototype = (
    ScratchBlocks as unknown as {
      Block: { prototype: Record<string, (() => void) | undefined> };
    }
  ).Block.prototype;
  for (const name of ['setDragStrategy', 'showContextMenu', 'initSvg', 'render']) {
    if (typeof prototype[name] !== 'function') prototype[name] = () => {};
  }
  // %n 参数孔需能接到数字输入；真机编辑器启动时也会打同一补丁。
  if (!procedureReportersPatched) {
    try {
      patchProcedureReporterBlocks();
      procedureReportersPatched = true;
    } catch {
      // Headless without full block registry can skip.
    }
  }
}

export function createAssistantController(
  workspace: Workspace,
  options: Options,
) {
  let sessionId = ScratchBlocks.utils.idGenerator.genUid();
  let baseline: {
    state: WorkspaceState;
    json: string;
    hash: string;
    projectId: string;
  } | null = null;
  let candidate: {
    id: string;
    projectId: string;
    state: WorkspaceState;
    code: string;
    baseJson: string;
    base: WorkspaceState;
    expiresAt: number;
  } | null = null;
  let checkpoint: Checkpoint | null = null;
  let recoveryRequired = false;

  // A candidate is deliberately short-lived. The base hash still protects
  // against edits, while this bound prevents an unattended preview from
  // remaining applicable indefinitely.
  const save = () =>
    cloneWorkspace(ScratchBlocks.serialization.workspaces.save(workspace));
  const reset = () => {
    sessionId = ScratchBlocks.utils.idGenerator.genUid();
    baseline = null;
    candidate = null;
    checkpoint = null;
    recoveryRequired = false;
  };
  function load(state: WorkspaceState) {
    ScratchBlocks.Events.disable();
    try {
      ScratchBlocks.serialization.workspaces.load(
        cloneWorkspace(state),
        workspace,
        { recordUndo: false },
      );
    } finally {
      ScratchBlocks.Events.enable();
    }
    // Loading with events disabled skips BLOCK_MOVE/CREATE, so colours_from_parent
    // shadows (port dropdowns, sliders) keep the default white style until a
    // later drag triggers onChange. Refresh them explicitly, like workspace.load.
    // Only rendered workspaces need this; headless ones have no render queue.
    if ((workspace as Workspace & { rendered?: boolean }).rendered) {
      try {
        refreshColoursFromParentInWorkspace(workspace);
      } catch {
        // Cosmetic only: keep a successfully loaded workspace when repainting fails.
      }
      // Events are disabled during load, so var_create never reaches the toolbox
      // listener. Rebuild the flyout or new variables stay hidden until re-entry.
      try {
        rebuildContinuousFlyout(workspace, { immediate: true });
      } catch {
        // The workspace blocks are already loaded; a stale flyout can be refreshed later.
      }
    }
  }
  function rollback(
    state: WorkspaceState,
    previousCheckpoint: Checkpoint | null,
  ) {
    try {
      load(state);
    } catch {
      // A failed load can clear or partly populate the live workspace. Keep the
      // backup installed before the first load, and guard this exact damaged
      // state against subsequent manual edits before a recovery retry.
      if (checkpoint) checkpoint.afterJson = stableWorkspaceJson(save());
      recoveryRequired = true;
      throw new Error(
        '工作区加载及回滚均失败，备份已保留。请先使用检查点恢复，暂勿继续编辑或离开作品。',
      );
    }
    checkpoint = previousCheckpoint;
    try {
      // Republish the rolled-back code and replace any scheduled persistence of
      // the failed candidate. Notification failures must not erase the backup.
      options.onApplied();
    } catch {
      // The request still reports the original failure to the user.
    }
  }
  function validate(state: WorkspaceState) {
    ensureHeadlessProcedureBlocks();
    // Headless workspace: no editor controller, persistence listener, bridge or BLE.
    const isolated = new ScratchBlocks.Workspace();
    ScratchBlocks.Events.disable();
    try {
      ScratchBlocks.serialization.workspaces.load(
        cloneWorkspace(state),
        isolated,
        { recordUndo: false },
      );
      const actual = summarizeWorkspace(
        omitDerivedProcedureInputs(
          cloneWorkspace(ScratchBlocks.serialization.workspaces.save(isolated)),
        ),
      );
      for (const expected of summarizeWorkspace(state)) {
        const found = actual.find(b => b.id === expected.id);
        if (
          !found ||
          found.type !== expected.type ||
          stableWorkspaceJson(found.statement ?? null) !==
            stableWorkspaceJson(expected.statement ?? null) ||
          found.nextId !== expected.nextId ||
          stableWorkspaceJson(found.inputNames.slice().sort()) !==
            stableWorkspaceJson(expected.inputNames.slice().sort()) ||
          Object.entries(expected.fields).some(
            ([key, value]) => String(found.fields[key]) !== String(value),
          )
        ) {
          throw new Error('候选积木加载后参数或连接发生变化，已拒绝应用。');
        }
      }
      const code = renderPythonCode(isolated as unknown as Workspace);
      if (code.includes('# TODO: unsupported block'))
        throw new Error('代码生成器尚不支持该作品中的部分积木。');
      return { code, blockCount: isolated.getAllBlocks(false).length };
    } finally {
      isolated.dispose();
      ScratchBlocks.Events.enable();
    }
  }
  function applied(requestId: string, projectId: string) {
    options.post({
      type: 'editor.workspace.candidate.applied',
      requestId,
      projectId,
      workspaceHash: workspaceFingerprint(save()),
      code: renderPythonCode(workspace),
      blockCount: workspace.getAllBlocks(false).length,
    });
  }
  function handleInbound(message: EditorInMessage): boolean {
    if (
      !message.type.startsWith('editor.workspace.candidate.') &&
      message.type !== 'editor.workspace.snapshot.request'
    )
      return false;
    if (!('requestId' in message) || !('projectId' in message)) return false;
    const { requestId, projectId } = message;
    try {
      if (
        typeof requestId !== 'string' ||
        !requestId ||
        requestId.length > 128 ||
        projectId !== options.getProjectId()
      )
        throw new Error('编辑器项目已切换或尚未加载。');
      if (
        message.type !== 'editor.workspace.snapshot.request' &&
        (!('sessionId' in message) || message.sessionId !== sessionId)
      )
        throw new Error('编辑器会话已变化，请重新生成。');
      if (
        recoveryRequired &&
        message.type !== 'editor.workspace.candidate.restore' &&
        message.type !== 'editor.workspace.candidate.discard'
      ) {
        throw new Error('存在尚未恢复的工作区备份，请先使用检查点恢复。');
      }
      switch (message.type) {
        case 'editor.workspace.snapshot.request': {
          const state = save();
          baseline = {
            state,
            json: stableWorkspaceJson(state),
            hash: workspaceFingerprint(state),
            projectId,
          };
          candidate = null;
          options.post({
            type: 'editor.workspace.snapshot',
            requestId,
            projectId,
            sessionId,
            catalogVersion: ASSISTANT_CAPABILITY_CATALOG_VERSION,
            workspace: state,
            workspaceHash: baseline.hash,
            code: renderPythonCode(workspace),
            blocks: summarizeWorkspace(state),
            blockCount: workspace.getAllBlocks(false).length,
            revision: 0,
          });
          break;
        }
        case 'editor.workspace.candidate.prepare': {
          candidate = null;
          if (
            !baseline ||
            baseline.projectId !== projectId ||
            message.catalogVersion !== ASSISTANT_CAPABILITY_CATALOG_VERSION ||
            baseline.hash !== message.baseWorkspaceHash ||
            stableWorkspaceJson(save()) !== baseline.json
          ) {
            throw new Error('作品内容已变化，请重新生成，原作品未修改。');
          }
          const id = ScratchBlocks.utils.idGenerator.genUid();
          const python =
            message.source?.kind === 'python' ? message.source.python : null;
          const programScope: AssistantProgramEditScope =
            message.source?.kind === 'python'
              ? (message.source.programScope ?? 'main')
              : 'main';
          if (python == null && !message.proposal) {
            throw new Error('候选缺少 Python 或结构化提案。');
          }
          if (python && python.length > 16_000) {
            throw new Error('Python 过长，无法转换成积木。');
          }
          const state =
            python != null
              ? buildPythonCandidate(
                  baseline.state,
                  python,
                  `ai-${id}`,
                  programScope,
                )
              : buildAssistantCandidate(
                  baseline.state,
                  message.proposal,
                  `ai-${id}`,
                );
          if (programScope === 'workspace') {
            const blocks = state.blocks?.blocks ?? [];
            const variables = Array.isArray(state.variables)
              ? state.variables
              : [];
            if (blocks.length > 0 || variables.length > 0) {
              throw new Error('清空工作区后仍有积木或变量，已拒绝。');
            }
          }
          const result = validate(state);
          if (
            python != null &&
            !isEmptyAssistantPython(python) &&
            normalizePythonForScope(python, programScope) !==
              normalizePythonForScope(result.code, programScope)
          ) {
            throw new Error(
              `反编译结果与原 Python 不一致。\n原程序：\n${normalizePythonForScope(python, programScope)}\n生成结果：\n${normalizePythonForScope(result.code, programScope)}`,
            );
          }
          candidate = {
            id,
            projectId,
            state,
            code: result.code,
            base: cloneWorkspace(baseline.state),
            baseJson: baseline.json,
            expiresAt: Date.now() + CANDIDATE_TTL_MS,
          };
          options.post({
            type: 'editor.workspace.candidate.ready',
            requestId,
            projectId,
            sessionId,
            candidateId: id,
            baseWorkspaceHash: baseline.hash,
            candidateWorkspaceHash: workspaceFingerprint(state),
            workspace: state,
            ...result,
          });
          break;
        }
        case 'editor.workspace.candidate.discard':
          // A late cancelled request must never discard a newer preview.
          // Keep baseline so a repair retry can prepare against the same snapshot.
          if (
            candidate?.id === message.candidateId &&
            candidate.projectId === projectId
          ) {
            candidate = null;
          }
          break;
        case 'editor.workspace.candidate.apply': {
          const pending = candidate;
          if (
            !pending ||
            pending.id !== message.candidateId ||
            pending.projectId !== projectId
          )
            throw new Error('候选已失效或已经应用，请重新生成。');
          if (Date.now() >= pending.expiresAt) {
            candidate = null;
            throw new Error('候选已过期，请重新生成。');
          }
          if (stableWorkspaceJson(save()) !== pending.baseJson)
            throw new Error('作品已有人工修改，请重新生成，不能覆盖。');
          candidate = null;
          baseline = null;
          const previousCheckpoint = checkpoint;
          // Install the backup before the destructive load, including its failure
          // path. A second load failure must never silently lose the original.
          checkpoint = {
            before: cloneWorkspace(pending.base),
            afterJson: pending.baseJson,
            projectId,
            sessionId,
          };
          try {
            load(pending.state);
            if (renderPythonCode(workspace) !== pending.code)
              throw new Error('应用后的代码与已编译候选不一致。');
            checkpoint.afterJson = stableWorkspaceJson(save());
            options.onApplied();
          } catch (error) {
            rollback(pending.base, previousCheckpoint);
            throw error;
          }
          applied(requestId, projectId);
          break;
        }
        case 'editor.workspace.candidate.restore': {
          if (
            !checkpoint ||
            checkpoint.projectId !== projectId ||
            checkpoint.sessionId !== sessionId
          )
            throw new Error('恢复点已失效，请重新生成候选。');
          if (stableWorkspaceJson(save()) !== checkpoint.afterJson)
            throw new Error('作品已继续编辑或没有恢复点，不能覆盖后续修改。');
          const current = save();
          const previousCheckpoint = checkpoint;
          try {
            load(checkpoint.before);
            options.onApplied();
          } catch (error) {
            rollback(current, previousCheckpoint);
            throw error;
          }
          recoveryRequired = false;
          checkpoint = null;
          candidate = null;
          baseline = null;
          applied(requestId, projectId);
          break;
        }
      }
    } catch (error) {
      options.post({
        type: 'editor.workspace.candidate.rejected',
        requestId,
        projectId,
        reason:
          error instanceof Error
            ? error.message
            : '候选处理失败，原作品保持不变。',
      });
    }
    return true;
  }
  return { handleInbound, reset };
}
