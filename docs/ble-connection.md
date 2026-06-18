# 蓝牙主机连接（Mobile）

移动端通过 `react-native-ble-plx` 连接 Spark_AI 主机，实现扫描、配对、连接与传感器数据订阅。主要代码位于 `apps/mobile/src/services/ble/`。

## 通信模型

- **服务 / 特征值**：`fff0` / `fff1`（见 `constants/bleCommand.ts`）
- **下行（App → 主机）**：`writeWithResponse` 发送固定帧命令（如 `sensing_update`、`stop_watch`、上传分包等）
- **上行（主机 → App）**：特征值 **Notify**，文本 JSON（`deviceWatch`）或二进制 ACK（上传 / 文件列表）
- **全局状态**：`useBleStore`（蓝牙开关、已连接设备、`deviceWatch`）；`BleStoreBootstrap` 在 App 启动时注册订阅

## 主机程序运行与 Notify

经实测，**主机在用户程序执行期间不会通过 Notify 推送 `deviceWatch` JSON**（`WillAiState` 为 `"run"` 时 App 侧收不到数据）。程序被 `app_stop`（`0xb9`）暂停或结束后，推送才会恢复。

因此：

- **不能**依赖实时 `WillAiState` 判断程序是否正在运行（运行期间无 Notify）
- 编辑器内暂停/运行按钮应基于用户操作，而非 `WillAiState` 回传
- 上传字节码期间 App 会进入二进制 ACK 模式，同样会暂时忽略 JSON Notify（上传完成后恢复）

`deviceWatch` JSON 根字段 `WillAiState`：`"run"` 表示运行中，`"stop"` 表示未运行——**仅在主机推送数据时有效**。

## 调试主机数据

在 `apps/mobile/src/services/ble/core/debug.ts` 将 `BLE_DEVICE_WATCH_DEBUG` 设为 `true`，Metro 过滤 `[BLE]` 即可看到 Notify 字节数、`deviceWatch` 完整 JSON 及 `WillAiState`。默认 `false`，避免刷屏。

## 已知坑 · 务必读

> **狠狠吐槽**：主机收到 App `writeWithResponse` 发下去的蓝牙命令后，**往往根本没有对应的 GATT Write Response 语义上的「命令回执」**——它不跟你握手确认，转头就自顾自 Notify 推数据；App 侧就算打出 `[TX OK]`，也只是手机蓝牙栈说「我写出去了」，**完全不能代表主机说命令对了**。命令到底执行成功还是 silently fail、还是压根没理会，只能靠后续 Notify 内容瞎猜，调试体验极差。

排查收发问题时，在 Metro 里过滤 `[BLE]`，关注 `[TX]`、`[RX]`、`warn` / `error` 即可（见 `services/ble/core/logger.ts`）。

## 目录结构

```
services/ble/
├── index.ts              # 对外统一导出
├── types.ts              # 共享类型
├── core/                 # 连接与协议收发
│   ├── manager.ts
│   ├── singleton.ts
│   ├── permissions.ts
│   ├── logger.ts
│   └── debug.ts
├── device-watch/         # 主机传感器数据
│   ├── model.ts
│   └── useDeviceWatch.ts
├── upload/               # 字节码上传
│   └── service.ts
├── storage/              # 已配对设备持久化
│   └── pairedDevices.ts
└── bootstrap/            # Store 订阅初始化
    └── BleStoreBootstrap.tsx
```

## 相关文件

| 路径 | 职责 |
|------|------|
| `apps/mobile/src/services/ble/core/manager.ts` | 连接、扫描、收发 |
| `apps/mobile/src/services/ble/upload/service.ts` | 字节码上传 |
| `apps/mobile/src/services/ble/device-watch/` | 传感器数据拆解与 Hook |
| `apps/mobile/src/store/useBleStore.ts` | 跨页面 BLE 状态 |
| `apps/mobile/src/screens/BleDevicesScreen/` | 设备扫描 / 配对 UI |
| `apps/mobile/src/constants/bleCommand.ts` | 命令常量、UUID |
| `apps/mobile/src/utils/bleProtocol.ts` | 帧编解码 |
| `apps/mobile/src/utils/bleDeviceParser.ts` | JSON 传感器解析 |
