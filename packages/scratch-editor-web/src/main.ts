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

function bootstrap(): void {
  registerEditorBlocks();
  const host = document.getElementById('workspace');

  if (!host) {
    return;
  }

  const workspace = ScratchBlocks.inject(host, {
    move: { scrollbars: true, drag: true, wheel: true },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 0.8,
      maxScale: 1.6,
      minScale: 0.45,
      scaleSpeed: 1.08,
      pinch: true,
    },
    media: 'https://unpkg.com/scratch-blocks@2.1.19/media/',
    trashcan: true,
    theme: editorTheme,
    sounds: false,
    toolbox: toolboxJson,
  });

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
