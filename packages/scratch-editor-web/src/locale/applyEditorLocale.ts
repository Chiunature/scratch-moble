import * as ScratchBlocks from 'scratch-blocks';
import {
  initEditorWebI18n,
  mapAppLocaleToScratchBlocksLocale,
  resolveEditorWebLocale,
  type AppLocale,
} from '@scratch-mobile/i18n';
import { EDITOR_EMBEDDED_LOCALE_GLOBAL } from '@scratch-mobile/shared';

import { registerEditorBlocks } from '../blocks/registerBlocks';
import { getToolboxJson } from '../blocks/toolbox';
import { refreshColoursFromParentInWorkspace } from '../blocks/portDropdownExtensions';
import type { Workspace } from '../codegen/types';
import {
  initScratchLocale,
  type ScratchBlocksLocale,
} from '../workspace-custom/initScratchLocale';
import { rebuildContinuousFlyout } from '../workspace-custom/dynamicToolbox';
import { patchToolboxCategoryIcons } from '../workspace-custom/toolbox/patchToolboxCategoryIcons';
import {
  applyProcedureModalI18n,
  ensureProcedureEditorModalDom,
} from '../workspace-custom/procedureEditor/procedureEditorModal';

let currentAppLocale: AppLocale = 'zh-CN';
let mainWorkspace: Workspace | null = null;

export function registerEditorWorkspace(workspace: Workspace): void {
  mainWorkspace = workspace;
}

export function getCurrentScratchBlocksLocale(): ScratchBlocksLocale {
  return mapAppLocaleToScratchBlocksLocale(currentAppLocale);
}

export function detectInitialEditorAppLocale(): AppLocale {
  // 1. RN WebView 注入（首帧正确语言） 2. ?lang= 预览  3. navigator
  const embedded = (
    globalThis as unknown as Record<string, string | undefined>
  )[EDITOR_EMBEDDED_LOCALE_GLOBAL];
  if (embedded) {
    return resolveEditorWebLocale(embedded);
  }
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const queryLocale = params.get('lang');
  if (queryLocale) {
    return resolveEditorWebLocale(queryLocale);
  }
  return resolveEditorWebLocale(globalThis.navigator?.language);
}

function refreshToolboxForLocale(workspace: Workspace): void {
  const nextToolbox = getToolboxJson();
  workspace.updateToolbox?.(nextToolbox);
  // 飞栏与主工作区分离：须 invalidate 才能按新定义新建 flyout 内 block 实例。
  // immediate：切语言时同步 rebuild，避免 150ms debounce 期间仍显示旧语言。
  rebuildContinuousFlyout(workspace, {
    invalidateFlyoutBlocks: true,
    immediate: true,
  });
  patchToolboxCategoryIcons(workspace);
}

/** 主工作区 block 通过 save/load 重建；与飞栏 invalidate 分工处理。 */
function reloadWorkspaceBlocksForLocale(workspace: Workspace): void {
  const state = ScratchBlocks.serialization.workspaces.save(workspace);
  registerEditorBlocks();
  ScratchBlocks.Events.disable();
  try {
    ScratchBlocks.serialization.workspaces.load(state, workspace, {
      recordUndo: false,
    });
  } finally {
    ScratchBlocks.Events.enable();
  }
  refreshColoursFromParentInWorkspace(workspace);
}

export async function applyEditorLocale(locale: AppLocale): Promise<void> {
  // workspace 已就绪且语言未变：跳过 save/load 与飞栏 rebuild（如 workspace.ready 重复注入）。
  if (mainWorkspace && locale === currentAppLocale) {
    return;
  }
  currentAppLocale = locale;
  await initEditorWebI18n(locale);
  initScratchLocale(mapAppLocaleToScratchBlocksLocale(locale));
  applyProcedureModalI18n(ensureProcedureEditorModalDom());

  if (mainWorkspace) {
    // 1. 主画布：serialization 换实例  2. 飞栏/toolbox：updateToolbox + rebuild（invalidate）
    reloadWorkspaceBlocksForLocale(mainWorkspace);
    refreshToolboxForLocale(mainWorkspace);
  } else {
    registerEditorBlocks();
  }
}
