# PikaScript Bytecode Runtime (vendor)

PikaScript v1.13.4 编译与运行时，源自 ELE-byteCode 项目。

## 目录

- `mobile/` — C API（compile / execute / executeBytecode）
- `pikascript/` — PikaScript 核心、标准库与 API 绑定
- `react-native-pika/` — React Native 原生模块（Yarn workspace 包）

## 更新

从 ELE-byteCode 同步时保留 `mobile/`、`pikascript/`、`pika_config.h`、`react-native-pika/`，
勿带入 Windows 构建产物（`*.exe`、`CMakeFiles/` 等）。

## 使用（轨道 A）

`apps/mobile` 已依赖 `react-native-pika`。编辑器代码面板提供：

- **编译** — Python → `.py.o`
- **运行源码** — 手机 VM 直接执行
- **运行字节码** — 执行上次编译产物

详细链路说明与 API 文档见：[docs/pika-runtime.md](../../docs/pika-runtime.md)

```bash
yarn install
yarn android   # 或 yarn ios
```
