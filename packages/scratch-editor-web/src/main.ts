/**
 * 编辑器入口。
 * bootstrap() 负责初始化积木、注入工作区、绑定变化监听并触发首次代码生成。
 * 具体功能均由各子模块实现，这里只做组装。
 */
import * as ScratchBlocks from 'scratch-blocks';

import { BLOCK_TYPES } from './blocks/blockTypes';
import { getToolboxJson } from './blocks/toolbox';
import { createWorkspaceController, type WorkspaceController } from './bridge/index';
import {
  EDITOR_RECEIVE_FROM_NATIVE_GLOBAL,
  type EditorInMessage,
} from '@scratch-mobile/shared';
import type { Workspace } from './codegen/types';
import { MEDIA_BASE_URL } from './media/constants';
import { patchMediaFetch } from './media/patchMediaFetch';
import {
  applyEditorLocale,
  detectInitialEditorAppLocale,
  registerEditorWorkspace,
} from './locale/applyEditorLocale';
import { editorTheme } from './theme';
import {
  patchFieldNumberEditor,
  patchMathNumberField,
  patchFieldMatrixLight,
  patchFieldNotePicker,
  patchFieldHandleShankPicker,
  patchFieldPortMulti,
  patchFlyoutGetWidthWhenHidden,
  patchToolboxCategoryIcons,
  patchScratchDraggerToolboxDelete,
  patchToolboxDeleteWhenFlyoutHidden,
  setupFlyoutWidthClamp,
  setupToolboxDoubleClickHideFlyout,
  setupDynamicToolboxCategoriesAndRefreshFlyout,
  ensureProcedureEditorModalDom,
  patchProcedureWorkspaceBehavior,
  installProcedureDragDebug,
  patchDataVariableReporterOutput,
  patchContextMenuMissingTextGuard,
} from './workspace-custom';

patchMediaFetch();

function refreshToolboxDomAfterLayout(workspace: Workspace): void {
  patchToolboxCategoryIcons(workspace);
}

async function bootstrap(): Promise<void> {
  await applyEditorLocale(detectInitialEditorAppLocale());
  patchContextMenuMissingTextGuard();

  patchProcedureWorkspaceBehavior();
  patchDataVariableReporterOutput();
  ensureProcedureEditorModalDom();
  patchFieldNumberEditor();
  patchMathNumberField();
  patchFieldMatrixLight();
  patchFieldNotePicker();
  patchFieldHandleShankPicker();
  patchFieldPortMulti();
  patchScratchDraggerToolboxDelete();

  const host = document.getElementById('workspace');

  if (!host) {
    return;
  }

  const workspace = ScratchBlocks.inject(host, {
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
    zoom: {
      controls: false,
      startScale: 0.8,
      maxScale: 1.6,
      minScale: 0.45,
      scaleSpeed: 1.08,
      pinch: true,
    },
    grid: {
      spacing: 20,
      length: 20,
      colour: 'rgba(15, 23, 42, 0.12)',
      snap: true,
    },
    media: MEDIA_BASE_URL,
    trashcan: false,
    maxInstances: {
      [BLOCK_TYPES.event.whenFlagClicked]: 1,
    },
    theme: editorTheme,
    sounds: true,
    toolbox: getToolboxJson(),
    modalInputs: false,
  });

  registerEditorWorkspace(workspace);
  setupDynamicToolboxCategoriesAndRefreshFlyout(workspace);
  installProcedureDragDebug(workspace);

  patchFlyoutGetWidthWhenHidden(workspace);
  patchToolboxDeleteWhenFlyoutHidden(workspace);
  workspace.resize?.();
  refreshToolboxDomAfterLayout(workspace);
  setupToolboxDoubleClickHideFlyout(workspace);
  requestAnimationFrame(() => {
    workspace.resize?.();
    refreshToolboxDomAfterLayout(workspace);
    setupFlyoutWidthClamp(workspace);
  });

  const controller = createWorkspaceController(workspace);
  controllerRef = controller;
  (
    window as typeof window & {
      [EDITOR_RECEIVE_FROM_NATIVE_GLOBAL]?: (message: EditorInMessage) => void;
    }
  )[EDITOR_RECEIVE_FROM_NATIVE_GLOBAL] = controller.handleMessageFromNative;
  controller.flushCodeGeneration();
}

let controllerRef: WorkspaceController | null = null;

/** 页面卸载时释放桥监听与定时器 */
export function disposeEditorBridge(): void {
  controllerRef?.dispose();
  controllerRef = null;
}

void bootstrap();
