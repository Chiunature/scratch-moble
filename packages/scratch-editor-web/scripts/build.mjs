import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(rootDir, '..', '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const sharedEntry = path.join(repoRoot, 'packages', 'shared', 'src', 'index.ts');

const css = `
:root {
  color-scheme: light;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
html,
body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f3f6ff;
  color: #0f172a;
}
.shell {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
}
.panel {
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.08);
}
.workspace-wrap {
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
}
#workspace {
  width: 100%;
  height: 100%;
}
/* Blockly：隐藏工作区滚动条 UI，但须保持 main.ts 里 move.scrollbars: true，否则无法空白处平移 */
#workspace .blocklyMainWorkspaceScrollbar .blocklyScrollbarHandle {
  display: none !important;
}
/* Blockly：隐藏飞出栏滚动条 UI，但须保持 main.ts 里 move.scrollbars: true，否则无法空白处平移 */
#workspace .blocklyScrollbarVertical.blocklyFlyoutScrollbar{
  display: none !important;
}

/* 每格容器的 --scratch-toolbox-selected-bg 由 patchToolboxCategoryIcons 从 TOOLBOX_CATEGORIES 写入 */
.blocklyToolboxCategory.blocklyToolboxSelected {
  background-color: var(--scratch-toolbox-selected-bg, #57e) !important;
}

/* 工具箱分类行布局（patchToolboxCategoryIcons 注入图标后生效） */
.blocklyTreeRowContentContainer {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 10px 8px;
}
.blocklyToolboxCategoryLabel {
  display: flex;
  justify-content: center;
  padding: 0;
}
.toolbox-category-icon {
  display: block;
  height: 24px;
  margin: 0 auto;
  width: 24px;
}

/* 拖到删除区：积木半透明（scratch-blocks 默认 blocklyDraggingDelete 仅改光标） */
.blocklyDraggingDelete {
  opacity: 0.45;
}
.blocklyDraggingDelete > .blocklyPath,
.blocklyDraggingDelete > .blocklyPathLight {
  fill-opacity: 0.45 !important;
  stroke-opacity: 0.45 !important;
}
.blocklyBlockDragSurface .blocklyDraggingDelete {
  opacity: 0.45;
}

/* 变量/自制积木飞栏按钮：保证中文标签在浅色背景上可见 */
.blocklyFlyoutButton .blocklyText {
  fill: #fff !important;
  font-size: 12pt;
}
.blocklyFlyoutButtonBackground {
  fill: #ff8c1a !important;
  stroke: #cc6600;
  stroke-width: 1;
}

.scratch-variable-prompt-backdrop,
.scratch-procedure-modal {
  align-items: center;
  background: rgba(15, 23, 42, 0.28);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 20px;
  position: fixed;
  z-index: 100000;
}
.scratch-variable-prompt-panel {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.24);
  max-width: 100%;
  padding: 20px;
  width: 320px;
}
.scratch-variable-prompt-title {
  color: #111827;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
}
.scratch-variable-prompt-message {
  color: #475569;
  font-size: 14px;
  line-height: 20px;
  margin-top: 12px;
  text-align: center;
}
.scratch-variable-prompt-input {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  color: #111827;
  font: 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  margin-top: 18px;
  outline: none;
  padding: 12px 14px;
  width: 100%;
}
.scratch-variable-prompt-actions,
.scratch-procedure-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}
.scratch-variable-prompt-button,
.scratch-procedure-button,
.scratch-procedure-tool {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font: 700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 10px 16px;
}
.scratch-variable-prompt-button-primary,
.scratch-procedure-confirm,
.scratch-procedure-tool {
  background: #ff8c1a;
  color: #fff;
}
.scratch-variable-prompt-button-secondary,
.scratch-procedure-cancel {
  background: #e2e8f0;
  color: #111827;
}
.scratch-procedure-modal-hidden {
  display: none;
}
.scratch-procedure-panel {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.24);
  display: flex;
  flex-direction: column;
  height: min(680px, 82vh);
  max-width: 960px;
  overflow: hidden;
  width: min(92vw, 960px);
}
.scratch-procedure-header {
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  padding: 14px 18px;
}
.scratch-procedure-title {
  color: #111827;
  font-size: 18px;
  font-weight: 800;
}
.scratch-procedure-close {
  background: transparent;
  border: 0;
  color: #475569;
  cursor: pointer;
  font-size: 26px;
  line-height: 1;
}
.scratch-procedure-toolbar {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 18px;
}
.scratch-procedure-workspace {
  background: #f3f6ff;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  position: relative;
}
.scratch-procedure-workspace > .injectionDiv {
  height: 100% !important;
  inset: 0;
  position: absolute !important;
  width: 100% !important;
}
.scratch-procedure-footer {
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
  margin-top: 0;
  padding: 14px 18px;
}

/* Blockly 字段编辑器须在自制积木弹窗(z-index:100000)之上。*/
.blocklyWidgetDiv {
  z-index: 100001 !important;
}
.blocklyWidgetDiv.fieldTextInput.removableTextInput {
  overflow: visible !important;
}
.blocklyTextRemoveIcon {
  cursor: pointer;
  height: 24px !important;
  left: 50% !important;
  margin-left: -12px !important;
  right: auto !important;
  top: -40px !important;
  transform: none;
  width: 24px !important;
}
`;

const htmlTemplate = jsCode => `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>${css}</style>
  </head>
  <body>
    <main class="shell">
      <section class="panel workspace-wrap">
        <div id="workspace"></div>
      </section>
    </main>
    <script>${jsCode}</script>
  </body>
</html>
`;

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

/** assets/toolbox 下图标内联进 bundle；其余 .svg 仍为 data URL（如缩放按钮） */
const toolboxSvgTextPlugin = {
  name: 'toolbox-svg-text',
  setup(build) {
    build.onLoad({ filter: /\.svg$/ }, async args => {
      const normalized = args.path.replace(/\\/g, '/');
      if (!normalized.includes('/assets/toolbox/')) {
        return undefined;
      }
      const contents = await readFile(args.path, 'utf8');
      return { contents, loader: 'text' };
    });
  },
};

await build({
  entryPoints: [path.join(srcDir, 'main.ts')],
  outfile: path.join(distDir, 'editor.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100', 'safari15'],
  minify: false,
  plugins: [toolboxSvgTextPlugin],
  loader: { '.svg': 'dataurl', '.png': 'dataurl' },
  alias: {
    '@scratch-mobile/shared': sharedEntry,
  },
});

const jsCode = await readFile(path.join(distDir, 'editor.js'), 'utf8');
await writeFile(path.join(distDir, 'index.html'), htmlTemplate(jsCode), 'utf8');

console.log('scratch-editor-web dist generated');
