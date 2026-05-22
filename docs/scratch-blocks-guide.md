# Scratch Blocks 使用说明（项目内）

本文档说明本项目中 `scratch-blocks` 的推荐写法、开发流程和常见问题。

## 背景

- 当前依赖：`scratch-blocks@2.1.19`
- 官方 2.x 方向：基于 Blockly 12 能力演进（不再是旧时代的 Blockly fork）
- 官方仓库：<https://github.com/scratchfoundation/scratch-blocks>

## 推荐写法（现代风格）

在本项目中，优先使用以下组合：

- 块定义：`defineBlocksWithJsonArray`
- 工具箱：`categoryToolbox` JSON
- 主题：`Theme.defineTheme(...)` + `style/categorystyle`
- 页面注入：`ScratchBlocks.inject(...)`

对应代码主要在：`packages/scratch-editor-web/src/`（入口为 `main.ts`，积木与生成逻辑已按目录拆分，见下文「目录结构」）。

### 1) 块定义

- 使用 `type` 管理块类型（项目里集中在 `src/blocks/blockTypes.ts` 的 `BLOCK_TYPES`）
- 使用 `style`（如 `event_blocks` / `motion_blocks` / `looks_blocks`）
- 避免在块定义里直接塞 `colour`，统一走主题样式

### 2) 工具箱定义

- 使用 JSON toolbox，不再使用 XML toolbox 作为主路径
- 分类颜色用 `categorystyle`（如 `event_category`）
- 默认参数用 `inputs.shadow.fields` 提供

### 3) 主题定义

- 统一在 `editorTheme` 中定义 `blockStyles/categoryStyles/componentStyles`
- Android 低版本 WebView 上，建议始终显式给出主要颜色，避免 `Invalid colour: "undefined"`

## `packages/scratch-editor-web` 目录结构

| 路径 | 作用 |
|------|------|
| `src/main.ts` | 编辑器入口：注册积木、`ScratchBlocks.inject`、订阅变更、调用 `workspace-custom` 中的定制逻辑。 |
| `src/blocks/` | 积木相关：`blockTypes.ts`（type 常量）、`registerBlocks.ts`（`defineBlocksWithJsonArray`）、`toolbox.ts`（`categoryToolbox` JSON 与默认 shadow）。 |
| `src/codegen/` | 工作区 → Python：`types.ts`、`helpers.ts`、`generators.ts`（按块类型生成语句与 `renderPythonCode`）。 |
| `src/theme.ts` | `Theme.defineTheme`：块色、分类色、工作区/工具栏等 `componentStyles`。 |
| `src/bridge.ts` | 与 React Native WebView 通信：`postMessage` 与 `editor.code.generated` 消息类型。 |
| `src/workspace-custom/` | 注入后定制：`patchScratchZoom.ts`（缩放条内置 SVG）、`toolboxDoubleClickHideFlyout.ts`（已选分类再次点击关闭飞出栏）、`flyoutWidthClamp.ts`（飞出栏默认最大宽度 + 横向裁剪，指针进入/按下时展开）；`index.ts` 统一导出。样式配合见 `scripts/build.mjs` 内 `.scratch-flyout-*`。 |
| `assets/zoom/` | 缩放按钮用的 SVG（构建时打成 data URL 打进包内）；替换图标只需改这三个文件并重新 build。 |
| `scripts/build.mjs` | esbuild 打包 `src/main.ts` → `dist/editor.js`，内联页面 CSS，合并为 `dist/index.html`。 |
| `scripts/sync-to-mobile.mjs` | 将 `dist/index.html` 写入 `apps/mobile/src/features/editor/generated/editorBundleHtml.ts`。 |
| `scripts/preview.mjs` | 本地预览 `dist`（详见脚本内说明）。 |
| `dist/` | 构建产物（`editor.js`、`index.html`），勿手改；由 `build` 生成。 |

## 开发流程

当你修改 `packages/scratch-editor-web/src/` 或 `assets/` 后，需要重新生成并同步到 mobile 侧的 HTML 常量文件。

### 手动流程

```bash
yarn workspace @scratch-mobile/scratch-editor-web build
yarn workspace @scratch-mobile/scratch-editor-web sync:mobile
```

或直接一条命令：

```bash
yarn editor:web
```

### 自动流程（推荐）

开发期建议开 2 个终端常驻：

1. 终端 A：RN 打包与热更新

```bash
yarn usb
```

2. 终端 B： 日志观察

日志观察（按需）：

```bash
yarn logs:mobile
```

需要清空历史日志再看新问题时：

```bash
yarn logs:mobile:reset
```

配合 RN 调试：

```bash
yarn usb
```

## 常见问题

### 1) `Invalid colour: "undefined"`

典型表现：`ScratchBlocks.inject` 阶段报错，堆栈在 `setTheme/validatedBlockStyle`。

处理建议：

- 确保块定义使用 `style`
- 确保主题内对应 `blockStyles` 和 `categoryStyles` 存在
- 避免混用历史遗留颜色扩展和缺失主题键

### 2) WebView 下 `Failed to fetch .../media/disconnect.mp3`（CORS）

当页面来源是 `about:blank`（`origin: null`）时，远端 `media` 资源可能被 CORS 拦截。

影响：

- 主要影响编辑器音效加载
- 一般不影响积木渲染和基本交互

可选处理：

- 若不需要音效，可在注入选项里设置 `sounds: false`
- 或将 `media` 资源改为可控的同源静态资源地址

### 3) Chrome 远程调试 WebView 404

老 Android WebView 内核与新 Chrome DevTools 前端可能版本不匹配。

建议：

- 优先使用 `inspect fallback`
- 或使用本地预览页调试：`yarn editor:web:preview`

## 相关文件

- `packages/scratch-editor-web/src/main.ts`（入口）
- `packages/scratch-editor-web/src/blocks/*`（积木与工具箱）
- `packages/scratch-editor-web/src/codegen/*`（Python 生成）
- `packages/scratch-editor-web/src/theme.ts`、`packages/scratch-editor-web/src/bridge.ts`
- `packages/scratch-editor-web/src/workspace-custom/*`（缩放条、飞出栏交互定制）
- `packages/scratch-editor-web/assets/zoom/*`（缩放图标资源）
- `packages/scratch-editor-web/scripts/build.mjs`
- `packages/scratch-editor-web/scripts/sync-to-mobile.mjs`
- `packages/scratch-editor-web/scripts/preview.mjs`
- `apps/mobile/src/features/editor/generated/editorBundleHtml.ts`（由 `yarn editor:web` 生成，勿手改）
- `apps/mobile/src/screens/EditorScreen/EditorScreen.tsx`
