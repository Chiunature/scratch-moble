import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

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
/* Blockly：隐藏滚动条 UI，但须保持 main.ts 里 move.scrollbars: true，否则无法空白处平移 */
#workspace .blocklyMainWorkspaceScrollbar .blocklyScrollbarHandle {
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
});

const jsCode = await readFile(path.join(distDir, 'editor.js'), 'utf8');
await writeFile(path.join(distDir, 'index.html'), htmlTemplate(jsCode), 'utf8');

console.log('scratch-editor-web dist generated');
