# Scratch Mobile

这是 Scratch 移动端应用的 React Native + Yarn workspaces monorepo 工程。

## 安装依赖

```sh
yarn install
```

## 工作区结构

```text
apps/mobile              React Native 主应用
packages/core           纯 TypeScript 核心逻辑
packages/protocol       纯 TypeScript 硬件协议逻辑
packages/shared         共享类型、常量和 schema
packages/scratch-editor-web   WebView 内嵌 Scratch 编辑器（esbuild 打包）
```

编辑器网页 bundle 不入库，克隆后需先生成：

```sh
yarn editor:web
```

该命令会构建 `packages/scratch-editor-web` 并同步到 `apps/mobile/src/features/editor/generated/`。修改编辑器或积木逻辑后请重新执行；`yarn android` / `yarn ios` 也会在启动前自动 sync。

## 运行

真机 USB 调试推荐先启动 Metro：

```sh
yarn usb
```

再打开另一个终端安装并启动 Android 应用：

```sh
yarn android
```

`yarn usb` 会先执行 `adb reverse tcp:8081 tcp:8081`，让真机通过 USB 连接本机 Metro 服务。

日常开发时，如果 App 已经装在真机上，通常只需要保持 `yarn usb` 运行，然后在手机上直接打开 App。只改 JS/TS 代码、样式或页面逻辑时，不需要重新执行 `yarn android`；如果热更新没有生效，可以在 Metro 终端按 `r` 重新加载。

改动原生 Android 配置、原生依赖、包名、权限、`AndroidManifest.xml`、Gradle 配置，或者首次安装、卸载后重装、换手机时，需要重新执行 `yarn android`。

## 检查

```sh
yarn lint
yarn editor:web
yarn test
yarn typecheck
```

模块边界规则见 `docs/module-boundary.md`。
scratch 的积木块更改规则见 `docs/scratch-blocks-guide.md`
