/**
 * 编辑器入口。
 * bootstrap() 负责初始化积木、注入工作区、绑定变化监听并触发首次代码生成。
 * 具体功能均由各子模块实现，这里只做组装。
 */
import * as ScratchBlocks from 'scratch-blocks';

import { registerEditorBlocks } from './blocks/registerBlocks';
import { BLOCK_TYPES } from './blocks/blockTypes';
import { getToolboxJson } from './blocks/toolbox';
import { createCodeGenerationPublisher } from './bridge/codeGenerationPublisher';
import { registerCodeGenerationFlush } from './bridge/codeGenNotify';
import { setupWorkspacePersistence } from './bridge/workspacePersistence';
import { registerNativeInboundBridge } from './bridge/index';
import type { Workspace } from './codegen/types';
import {
  applyEditorLocale,
  detectInitialEditorAppLocale,
  registerEditorWorkspace,
} from './locale/applyEditorLocale';
import { editorTheme } from './theme';
import {
  ensureScratchZoomControlsIfMissing,
  patchFieldNumberEditor,
  patchFieldPortPicker,
  patchFieldMatrixLight,
  patchFieldNotePicker,
  patchFieldHandleShankPicker,
  patchFlyoutGetWidthWhenHidden,
  patchScratchZoomControlImages,
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

/** 缩放条图、分类图标、滚动条：inject / resize 后 Blockly 可能重绘 DOM，需统一再跑一遍 */
function refreshToolboxDomAfterLayout(workspace: Workspace): void {
  patchScratchZoomControlImages(workspace);
  patchToolboxCategoryIcons(workspace);
}

async function bootstrap(): Promise<void> {
  await applyEditorLocale(detectInitialEditorAppLocale());
  patchContextMenuMissingTextGuard();

  registerNativeInboundBridge();
  registerEditorBlocks();
  patchProcedureWorkspaceBehavior();
  patchDataVariableReporterOutput();
  ensureProcedureEditorModalDom();
  patchFieldNumberEditor();
  patchFieldPortPicker();
  patchFieldMatrixLight();
  patchFieldNotePicker();
  patchFieldHandleShankPicker();
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
      controls: true,
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
    media: 'https://unpkg.com/scratch-blocks@2.1.19/media/',
    trashcan: false,
    maxInstances: {
      [BLOCK_TYPES.event.whenFlagClicked]: 1,
    },
    theme: editorTheme,
    sounds: false,
    toolbox: getToolboxJson(),
    modalInputs: false,
  });

  registerEditorWorkspace(workspace);
  setupDynamicToolboxCategoriesAndRefreshFlyout(workspace);
  installProcedureDragDebug(workspace);

  ensureScratchZoomControlsIfMissing(workspace);
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

  const { schedule: scheduleCodePublish, flush: flushCodePublish } =
    createCodeGenerationPublisher(workspace);

  registerCodeGenerationFlush(flushCodePublish);
  setupWorkspacePersistence(workspace);
  workspace.addChangeListener(() => scheduleCodePublish());
  flushCodePublish();
}

void bootstrap();
