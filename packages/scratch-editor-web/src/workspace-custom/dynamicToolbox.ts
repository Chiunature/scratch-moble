/**
 * 变量 / 自制积木动态工具箱：注册 scratch-blocks 的飞栏回调与创建提示。
 */
import * as ScratchBlocks from 'scratch-blocks';

import type { Workspace } from '../codegen/types';
import { openProcedureEditorModal } from './procedureEditor';
import { openVariablePrompt } from './variablePromptBridge';

type FlyoutLike = {
  show: (contents: unknown) => void;
  setRecyclingEnabled?: (enabled: boolean) => void;
  getRecyclableInflater?: () => { emptyRecycledBlocks: () => void };
};

type ContinuousToolboxLike = {
  /** ScratchContinuousToolbox：须用 forceRerender，勿直接 getInitialFlyoutContents + show */
  forceRerender?: () => void;
  getInitialFlyoutContents?: () => unknown;
  getInitialFlyoutContents_?: () => unknown;
  getFlyout?: () => FlyoutLike | null;
};

/**
 * Continuous Flyout 的 block 回收（RecyclableBlockFlyoutInflater）按 type 复用 BlockSvg。
 * 切语言后 message0 已变，但复用实例不会重跑 init，飞栏仍显示旧文案。
 * 仅在 applyEditorLocale 路径传入 invalidateFlyoutBlocks 时临时关闭回收。
 */
function prepareFlyoutBlockRecycling(workspace: Workspace): void {
  const flyout = (workspace.getToolbox() as ContinuousToolboxLike | null)?.getFlyout?.();
  if (!flyout) {
    return;
  }
  flyout.setRecyclingEnabled?.(false);
  try {
    flyout.getRecyclableInflater?.()?.emptyRecycledBlocks();
  } catch {
    // 非 ContinuousFlyout 时忽略。
  }
}

function restoreFlyoutBlockRecycling(workspace: Workspace): void {
  const flyout = (workspace.getToolbox() as ContinuousToolboxLike | null)?.getFlyout?.();
  flyout?.setRecyclingEnabled?.(true);
}

/**
 * Scratch ContinuousFlyout 在 inject 时会先 show 一整条飞栏；
 * 动态分类（VARIABLE / PROCEDURE）须在 registerToolboxCategoryCallback 之后重新 show，
 * 否则变量区只剩标签、自制积木区为空，收起再弹出才正常。
 */
let flyoutRebuildFrame: number | null = null;
let flyoutRebuildTimer: ReturnType<typeof setTimeout> | null = null;

type RebuildContinuousFlyoutOptions = {
  /**
   * 切语言时为 true：show 前关回收并清空缓存，show 后恢复。
   * 变量/自制积木等日常刷新保持 false，继续走 Scratch 默认复用以减少 DOM 重建。
   */
  invalidateFlyoutBlocks?: boolean;
  /** 切语言时为 true：跳过 debounce，避免飞栏短暂显示旧文案。 */
  immediate?: boolean;
};

function runContinuousFlyoutRebuild(
  workspace: Workspace,
  invalidateFlyoutBlocks: boolean,
): void {
  const toolbox = workspace.getToolbox() as ContinuousToolboxLike | null;
  if (!toolbox) {
    return;
  }
  if (invalidateFlyoutBlocks) {
    prepareFlyoutBlockRecycling(workspace);
  }
  try {
    // ScratchContinuousToolbox.refreshSelection 是空操作；forceRerender 使用
    // getInitialFlyoutContents_（正确绑定 this），并恢复当前选中的分类。
    if (toolbox.forceRerender) {
      toolbox.forceRerender();
      return;
    }
    const getContents =
      toolbox.getInitialFlyoutContents_ ?? toolbox.getInitialFlyoutContents;
    if (!getContents || !toolbox.getFlyout) {
      return;
    }
    const contents = getContents.call(toolbox);
    toolbox.getFlyout()?.show(contents);
  } finally {
    if (invalidateFlyoutBlocks) {
      restoreFlyoutBlockRecycling(workspace);
    }
  }
}

/**
 * 重建 Continuous 飞栏内容。变量/自制积木变更等默认调用即可；
 * 切语言时由 applyEditorLocale 传入 invalidateFlyoutBlocks。
 */
export function rebuildContinuousFlyout(
  workspace: Workspace,
  options?: RebuildContinuousFlyoutOptions,
): void {
  const invalidateFlyoutBlocks = options?.invalidateFlyoutBlocks ?? false;
  const immediate = options?.immediate ?? false;

  if (immediate) {
    if (flyoutRebuildFrame !== null) {
      cancelAnimationFrame(flyoutRebuildFrame);
      flyoutRebuildFrame = null;
    }
    if (flyoutRebuildTimer !== null) {
      clearTimeout(flyoutRebuildTimer);
      flyoutRebuildTimer = null;
    }
    runContinuousFlyoutRebuild(workspace, invalidateFlyoutBlocks);
    return;
  }

  if (flyoutRebuildFrame !== null) {
    cancelAnimationFrame(flyoutRebuildFrame);
  }
  if (flyoutRebuildTimer !== null) {
    clearTimeout(flyoutRebuildTimer);
  }
  flyoutRebuildTimer = setTimeout(() => {
    flyoutRebuildTimer = null;
    flyoutRebuildFrame = requestAnimationFrame(() => {
      flyoutRebuildFrame = null;
      runContinuousFlyoutRebuild(workspace, invalidateFlyoutBlocks);
    });
  }, 150);
}

function refreshToolbox(workspace: Workspace): void {
  rebuildContinuousFlyout(workspace);
}

/** 等渲染队列结束再重建飞栏，避免 prototype / 调用块尚未落盘。 */
function scheduleToolboxRefresh(workspace: Workspace): void {
  void ScratchBlocks.renderManagement
    .finishQueuedRenders()
    .then(() => refreshToolbox(workspace));
}

const PROCEDURE_BLOCK_TYPES = new Set([
  'procedures_definition',
  'procedures_call',
  'procedures_prototype',
]);

/** 移动端不展示舞台监视器相关积木，仅从变量飞栏隐藏。 */
const HIDDEN_VARIABLE_FLYOUT_BLOCK_TYPES = new Set([
  'data_showvariable',
  'data_hidevariable',
  'data_showlist',
  'data_hidelist',
]);

function filterVariableFlyoutContents(contents: Element[]): Element[] {
  return contents.filter(element => {
    if (element.tagName.toLowerCase() !== 'block') {
      return true;
    }
    const blockType = element.getAttribute('type');
    return !blockType || !HIDDEN_VARIABLE_FLYOUT_BLOCK_TYPES.has(blockType);
  });
}

type SerializedBlockState = {
  type?: string;
  inputs?: Record<
    string,
    { block?: SerializedBlockState; shadow?: SerializedBlockState }
  >;
  next?: { block?: SerializedBlockState; shadow?: SerializedBlockState };
};

function serializedStateHasProcedureBlock(
  state: SerializedBlockState | undefined,
): boolean {
  if (!state?.type) {
    return false;
  }
  if (PROCEDURE_BLOCK_TYPES.has(state.type)) {
    return true;
  }
  for (const input of Object.values(state.inputs ?? {})) {
    if (
      serializedStateHasProcedureBlock(input.block) ||
      serializedStateHasProcedureBlock(input.shadow)
    ) {
      return true;
    }
  }
  const next = state.next;
  if (next) {
    return (
      serializedStateHasProcedureBlock(next.block) ||
      serializedStateHasProcedureBlock(next.shadow)
    );
  }
  return false;
}

function xmlHasProcedureBlock(node: Element | DocumentFragment): boolean {
  if (node instanceof Element) {
    if (node.tagName.toLowerCase() === 'block') {
      const type = node.getAttribute('type');
      if (type && PROCEDURE_BLOCK_TYPES.has(type)) {
        return true;
      }
    }
    for (const child of node.children) {
      if (xmlHasProcedureBlock(child)) {
        return true;
      }
    }
    return false;
  }
  for (const child of node.childNodes) {
    if (child instanceof Element && xmlHasProcedureBlock(child)) {
      return true;
    }
  }
  return false;
}

/** Blockly create/delete 事件无 blockType，须从 json / xml 快照判断。 */
function blockLifecycleEventAffectsProcedures(event: {
  json?: SerializedBlockState;
  oldJson?: SerializedBlockState;
  xml?: Element | DocumentFragment;
  oldXml?: Element | DocumentFragment;
}): boolean {
  return (
    serializedStateHasProcedureBlock(event.json) ||
    serializedStateHasProcedureBlock(event.oldJson) ||
    (event.xml ? xmlHasProcedureBlock(event.xml) : false) ||
    (event.oldXml ? xmlHasProcedureBlock(event.oldXml) : false)
  );
}

export function setupDynamicToolboxCategories(workspace: Workspace): void {
  ScratchBlocks.ScratchVariables.setPromptHandler(
    (message, defaultValue, callback, title, varType) => {
      openVariablePrompt({
        message,
        defaultValue,
        callback,
        title,
        varType,
      });
    },
  );

  ScratchBlocks.ScratchProcedures.externalProcedureDefCallback = (
    mutation,
    postEditCallback,
  ) => {
    openProcedureEditorModal({
      mutation,
      postEditCallback,
      // 保存后须刷新飞栏；等渲染队列结束再 rebuild，避免 prototype 尚未更新完。
      onSaved: () => scheduleToolboxRefresh(workspace),
    });
  };

  workspace.registerToolboxCategoryCallback(
    ScratchBlocks.VARIABLE_CATEGORY_NAME,
    ws =>
      filterVariableFlyoutContents(
        ScratchBlocks.ScratchVariables.getVariablesCategory(ws),
      ),
  );
  workspace.registerToolboxCategoryCallback(
    ScratchBlocks.PROCEDURE_CATEGORY_NAME,
    ws => ScratchBlocks.ScratchProcedures.getProceduresCategory(ws),
  );

  workspace.addChangeListener(event => {
    if (event.isUiEvent) {
      return;
    }
    const type = event.type;
    if (
      type === 'var_create' ||
      type === 'var_delete' ||
      type === 'var_rename'
    ) {
      refreshToolbox(workspace);
      return;
    }
    if (type === 'change') {
      const changeEvent = event as {
        blockId?: string;
        element?: string;
      };
      if (changeEvent.element === 'mutation' && changeEvent.blockId) {
        const block = workspace.getBlockById(changeEvent.blockId);
        if (block && PROCEDURE_BLOCK_TYPES.has(block.type)) {
          scheduleToolboxRefresh(workspace);
        }
      }
      return;
    }
    if (type === 'create' || type === 'delete') {
      if (
        blockLifecycleEventAffectsProcedures(
          event as {
            json?: SerializedBlockState;
            oldJson?: SerializedBlockState;
            xml?: Element | DocumentFragment;
            oldXml?: Element | DocumentFragment;
          },
        )
      ) {
        scheduleToolboxRefresh(workspace);
      }
    }
  });
}

/** inject 完成后调用：先注册动态分类回调，再重建整条 Continuous 飞栏 */
export function setupDynamicToolboxCategoriesAndRefreshFlyout(
  workspace: Workspace,
): void {
  setupDynamicToolboxCategories(workspace);
  requestAnimationFrame(() => rebuildContinuousFlyout(workspace));
}
