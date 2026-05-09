/**
 * 编辑器入口。
 * bootstrap() 负责初始化积木、注入工作区、绑定变化监听并触发首次代码生成。
 * 具体功能均由各子模块实现，这里只做组装。
 */
import * as ScratchBlocks from 'scratch-blocks';

import { registerEditorBlocks } from './blocks/registerBlocks';
import { toolboxJson } from './blocks/toolbox';
import { postToReactNative } from './bridge';
import { renderPythonCode } from './codegen/generators';
import { editorTheme } from './theme';
import {
  ensureScratchZoomControlsIfMissing,
  patchScratchZoomControlImages,
  patchToolboxCategoryIcons,
  setupFlyoutWidthClamp,
  setupToolboxDoubleClickHideFlyout,
} from './workspace-custom';

function bootstrap(): void {
  registerEditorBlocks();
  const host = document.getElementById('workspace');

  if (!host) {
    return;
  }

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
    theme: editorTheme,
    sounds: false, //交互音效
    toolbox: toolboxJson, //工具箱定义 xml或者json
  });

  ensureScratchZoomControlsIfMissing(workspace);
  workspace.resize?.();
  patchScratchZoomControlImages(workspace);
  patchToolboxCategoryIcons(workspace);

  requestAnimationFrame(() => {
    workspace.resize?.();
    patchScratchZoomControlImages(workspace);
    patchToolboxCategoryIcons(workspace);
    setupFlyoutWidthClamp(workspace);
  });

  setupToolboxDoubleClickHideFlyout(workspace);

  const publish = (): void => {
    const generated = renderPythonCode(workspace);
    postToReactNative({
      type: 'editor.code.generated',
      code: generated,
      blockCount: workspace.getAllBlocks(false).length,
    });
  };

  workspace.addChangeListener(() => publish());
  publish();
}

bootstrap();
