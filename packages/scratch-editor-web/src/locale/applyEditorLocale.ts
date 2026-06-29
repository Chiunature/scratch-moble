import {
  initEditorWebI18n,
  mapAppLocaleToScratchBlocksLocale,
  resolveEditorWebLocale,
  type AppLocale,
} from '@scratch-mobile/i18n';

import { getToolboxJson } from '../blocks/toolbox';
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

export function getCurrentEditorAppLocale(): AppLocale {
  return currentAppLocale;
}

export function getCurrentScratchBlocksLocale(): ScratchBlocksLocale {
  return mapAppLocaleToScratchBlocksLocale(currentAppLocale);
}

export function detectInitialEditorAppLocale(): AppLocale {
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
  rebuildContinuousFlyout(workspace);
  patchToolboxCategoryIcons(workspace);
}

export async function applyEditorLocale(locale: AppLocale): Promise<void> {
  currentAppLocale = locale;
  await initEditorWebI18n(locale);
  initScratchLocale(mapAppLocaleToScratchBlocksLocale(locale));
  applyProcedureModalI18n(ensureProcedureEditorModalDom());

  if (mainWorkspace) {
    refreshToolboxForLocale(mainWorkspace);
  }
}
