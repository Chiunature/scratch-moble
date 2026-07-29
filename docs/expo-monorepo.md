# Expo + Yarn Monorepo

本仓库是 **Yarn workspaces monorepo**，其中只有 `apps/mobile` 是 Expo / React Native 应用壳。两者职责不冲突：

| 层 | 职责 |
|----|------|
| Monorepo（根 + `packages/*`） | 拆包、共享逻辑、统一脚本与 typecheck |
| Expo（`apps/mobile`） | 原生依赖、Dev Client、iOS/Android 构建与运行 |

## 目录约定

```text
apps/mobile                 Expo App：页面、导航、原生桥、设备能力
apps/mobile/src/features/*  仅 App 使用的功能模块（如 remoteControl）
packages/*                  可复用、尽量与 RN UI 解耦的库
```

放哪里：

- **只服务当前 App 的 UI / 交互 / BLE 调用** → `apps/mobile/src/features/...`
- **多包共享、可单测的纯逻辑 / 协议 / 常量** → `packages/...`
- 模块依赖方向见 [`module-boundary.md`](./module-boundary.md)

## 给 mobile 装依赖（重要）

不要在仓库根目录直接跑：

```sh
# ❌ 会踩 workspace 坑
npx expo install some-native-lib
yarn add some-native-lib
```

根目录的 `expo install` 往往会执行「往 workspace root 加包」，被 Yarn 拒绝。

### 推荐命令

**Expo / RN 原生相关库**（自动选 SDK 兼容版本）：

```sh
yarn mobile:expo-install react-native-gesture-handler
yarn mobile:expo-install expo-haptics react-native-reanimated
```

等价于在 `apps/mobile` 下执行 `expo install`，依赖会写入 `@scratch-mobile/mobile` 的 `package.json`。

**已知版本号，或非 Expo 管理的包**：

```sh
yarn mobile:add lodash
yarn mobile:add some-lib@1.2.3
```

等价于：

```sh
yarn workspace @scratch-mobile/mobile add <pkg>
```

### 装完原生模块之后

改动了带原生代码的依赖（如 `react-native-gesture-handler`、BLE、相机等）后，需要重建 Dev Client，仅 Metro 热更新不够：

```sh
yarn ios
# 或
yarn android
```

## 日常开发命令

| 目的 | 命令 |
|------|------|
| 起 Metro | `yarn start` / `yarn usb` |
| 装并跑 App | `yarn ios` / `yarn android` |
| 检查 Expo 依赖是否对齐 | `yarn workspace @scratch-mobile/mobile deps:check` |

## 和「架构乱」相关的心智模型

1. **Expo 不是整个 monorepo 的包管理器**，它只服务 `apps/mobile`。
2. **根 `package.json` 的 scripts** 是快捷入口；真正的 App 依赖在 `apps/mobile/package.json`。
3. 功能代码优先落在 `features`；只有确认要跨包复用时再抽到 `packages`。
