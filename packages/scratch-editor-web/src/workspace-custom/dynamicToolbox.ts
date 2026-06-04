/**
 * 变量 / 自制积木动态工具箱：注册 scratch-blocks 的飞栏回调与创建提示。
 */
import * as ScratchBlocks from 'scratch-blocks';

import type { Workspace } from '../codegen/types';

type ContinuousToolboxLike = {
  getInitialFlyoutContents?: () => unknown;
  getFlyout?: () => { show: (contents: unknown) => void } | null;
  getSelectedItem?: () => { getName?: () => string } | null;
  forceRerender?: () => void;
};

/**
 * Scratch ContinuousFlyout 在 inject 时会先 show 一整条飞栏；
 * 动态分类（VARIABLE / PROCEDURE）须在 registerToolboxCategoryCallback 之后重新 show，
 * 否则变量区只剩标签、自制积木区为空，收起再弹出才正常。
 */
export function rebuildContinuousFlyout(workspace: Workspace): void {
  const toolbox = workspace.getToolbox() as ContinuousToolboxLike | null;
  if (!toolbox?.getInitialFlyoutContents || !toolbox.getFlyout) {
    return;
  }
  const contents = toolbox.getInitialFlyoutContents();
  const flyout = toolbox.getFlyout();
  flyout?.show(contents);
}

function refreshToolbox(workspace: Workspace): void {
  rebuildContinuousFlyout(workspace);
}

function defaultPromptHandler(
  message: string,
  defaultValue: string,
  callback: (text: string) => void,
  title?: string,
): void {
  const promptText = title ? `${title}\n${message}` : message;
  const result = window.prompt(promptText, defaultValue);
  if (result === null) {
    callback('');
    return;
  }
  callback(result);
}

/** 简易编辑：仅改 procCode 文案；完整参数编辑需后续接 RN / 浮层 */
function externalProcedureDefCallback(
  mutation: Element,
  postEditCallback: (mutation?: Element) => void,
): void {
  const current = mutation.getAttribute('proccode') ?? '';
  const next = window.prompt('自制积木名称', current);
  if (next === null) {
    return;
  }
  const trimmed = next.trim();
  if (trimmed) {
    mutation.setAttribute('proccode', trimmed);
  }
  postEditCallback(mutation);
}

export function setupDynamicToolboxCategories(workspace: Workspace): void {
  ScratchBlocks.ScratchVariables.setPromptHandler((message, defaultValue, callback) => {
    defaultPromptHandler(message, defaultValue, (text) => {
      callback(text, []);
    });
  });

  ScratchBlocks.ScratchProcedures.externalProcedureDefCallback =
    externalProcedureDefCallback;

  workspace.registerToolboxCategoryCallback(
    ScratchBlocks.VARIABLE_CATEGORY_NAME,
    ws => ScratchBlocks.ScratchVariables.getVariablesCategory(ws),
  );
  workspace.registerToolboxCategoryCallback(
    ScratchBlocks.PROCEDURE_CATEGORY_NAME,
    ws => ScratchBlocks.ScratchProcedures.getProceduresCategory(ws),
  );

  const procedureBlockTypes = new Set([
    'procedures_definition',
    'procedures_call',
    'procedures_prototype',
  ]);

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
    if (type === 'create' || type === 'delete') {
      const blockType = (event as { blockType?: string }).blockType;
      if (blockType && procedureBlockTypes.has(blockType)) {
        refreshToolbox(workspace);
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
