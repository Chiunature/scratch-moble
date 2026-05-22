# 模块边界

## 依赖方向

- `apps/mobile` 可以依赖 `packages/core`、`packages/protocol` 和 `packages/shared`。
- `packages/core` 可以依赖 `packages/shared`。
- `packages/protocol` 可以依赖 `packages/shared`。
- `packages/shared` 应保持轻量，不能依赖 app、core、protocol、React Native 或 DOM API。

## 包职责

- `apps/mobile`：React Native 页面、导航、App providers、移动端服务、原生桥接和 UI 状态。
- `packages/core`：纯 TypeScript 的项目、积木、运行时、资源和编解码逻辑。
- `packages/protocol`：纯 TypeScript 的硬件协议类型、编码、解码和校验逻辑。
- `packages/shared`：共享类型、常量、schema 定义和小型跨端工具函数（含 WebView 编辑器桥协议 `types/editorBridge`）。

## 运行时边界

`packages/core`、`packages/protocol` 和 `packages/shared` 应保持纯 TypeScript。React Native API、权限、BLE、串口、文件系统访问、导航和 UI 组件都应放在 `apps/mobile` 内。
