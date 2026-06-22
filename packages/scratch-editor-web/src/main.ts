/**
 * 编辑器入口。
 * bootstrap() 负责初始化积木、注入工作区、绑定变化监听并触发首次代码生成。
 * 具体功能均由各子模块实现，这里只做组装。
 */
import * as ScratchBlocks from 'scratch-blocks';

import { registerEditorBlocks } from './blocks/registerBlocks';
import { BLOCK_TYPES } from './blocks/blockTypes';
import { toolboxJson } from './blocks/toolbox';
import { createCodeGenerationPublisher } from './bridge/codeGenerationPublisher';
import { registerCodeGenerationFlush } from './bridge/codeGenNotify';
import { setupWorkspacePersistence } from './bridge/workspacePersistence';
import { registerNativeInboundBridge } from './bridge/index';
import type { Workspace } from './codegen/types';
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
  setupFlyoutWidthClamp,
  setupToolboxDoubleClickHideFlyout,
  setupDynamicToolboxCategoriesAndRefreshFlyout,
  ensureProcedureEditorModalDom,
  patchProcedureWorkspaceBehavior,
  installProcedureDragDebug,
  patchDataVariableReporterOutput,
  initScratchLocale,
  patchContextMenuMissingTextGuard,
} from './workspace-custom';

/** 缩放条图、分类图标、滚动条：inject / resize 后 Blockly 可能重绘 DOM，需统一再跑一遍 */
function refreshToolboxDomAfterLayout(workspace: Workspace): void {
  patchScratchZoomControlImages(workspace);
  patchToolboxCategoryIcons(workspace);
}

function bootstrap(): void {
  // Blockly ESM 默认不加载核心 Msg；须先合并 zh-hans 再应用 Scratch 文案包
  initScratchLocale('zh-cn');
  patchContextMenuMissingTextGuard();

  registerNativeInboundBridge(); //挂载WebView与React Native的桥接
  registerEditorBlocks(); //— 注册 shadow 积木
  patchProcedureWorkspaceBehavior();
  patchDataVariableReporterOutput();
  ensureProcedureEditorModalDom();
  patchFieldNumberEditor();
  patchFieldPortPicker();
  patchFieldMatrixLight();
  patchFieldNotePicker();
  patchFieldHandleShankPicker();

  const host = document.getElementById('workspace');

  if (!host) {
    return;
  }
  // 注入工作区 + toolbox
  const workspace = ScratchBlocks.inject(host, {
    move: {
      // Blockly：scrollbars 为 false 时，选项解析会把 drag / wheel 一并关掉，空白处无法平移工作区（含移动端滑动）。
      scrollbars: true,
      drag: true,
      wheel: true,
    },
    zoom: {
      controls: true, //显示缩放控件
      startScale: 0.8, //初始缩放比例
      maxScale: 1.6, //最大缩放比例
      minScale: 0.45, //最小缩放比例
      scaleSpeed: 1.08, //缩放速度
      pinch: true, //允许捏合缩放
    },
    grid: {
      spacing: 20, //网格间距
      length: 20, //网格长度
      colour: 'rgba(15, 23, 42, 0.12)',
      snap: true, //网格吸附
    },
    media: 'https://unpkg.com/scratch-blocks@2.1.19/media/',
    trashcan: false, //垃圾桶
    maxInstances: {
      [BLOCK_TYPES.event.whenFlagClicked]: 1,
    },
    theme: editorTheme,
    sounds: false, //交互音效
    toolbox: toolboxJson, //工具箱定义 xml或者json
    // field_number_keyboard 使用系统键盘（quietInput=false）；若此处为 true（Blockly 默认），触摸下会走
    // FieldTextInput#showPromptEditor → window.prompt（RN WebView 里像「JS 弹窗」），且 CHANGE_VALUE_TITLE 常为空。
    modalInputs: false,
  });

  setupDynamicToolboxCategoriesAndRefreshFlyout(workspace);
  installProcedureDragDebug(workspace);

  // 确保缩放控件存在
  ensureScratchZoomControlsIfMissing(workspace);
  // 确保飞出栏宽度正确
  patchFlyoutGetWidthWhenHidden(workspace);
  workspace.resize?.(); // 确保工作区大小正确
  refreshToolboxDomAfterLayout(workspace);
  setupToolboxDoubleClickHideFlyout(workspace); // 确保工具箱点击隐藏
  requestAnimationFrame(() => {
    workspace.resize?.(); // 确保工作区大小正确
    refreshToolboxDomAfterLayout(workspace);
    setupFlyoutWidthClamp(workspace); // 确保工具箱宽度正确
  });

  const { schedule: scheduleCodePublish, flush: flushCodePublish } =
    createCodeGenerationPublisher(workspace);

  registerCodeGenerationFlush(flushCodePublish);
  setupWorkspacePersistence(workspace);
  workspace.addChangeListener(() => scheduleCodePublish());
  flushCodePublish();
}

bootstrap();
