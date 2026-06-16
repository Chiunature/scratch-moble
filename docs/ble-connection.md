# 蓝牙主机连接（Mobile）

移动端通过 `react-native-ble-plx` 连接 Spark_AI 主机，实现扫描、配对、连接与传感器数据订阅。主要代码位于 `apps/mobile/src/services/ble/`。

## 通信模型

- **服务 / 特征值**：`fff0` / `fff1`（见 `constants/bleCommand.ts`）
- **下行（App → 主机）**：`writeWithResponse` 发送固定帧命令（如 `sensing_update`、`stop_watch`、上传分包等）
- **上行（主机 → App）**：特征值 **Notify**，文本 JSON（`deviceWatch`）或二进制 ACK（上传 / 文件列表）
- **全局状态**：`useBleStore`（蓝牙开关、已连接设备、`deviceWatch`）；`BleStoreBootstrap` 在 App 启动时注册订阅

## 已知坑 · 务必读

> **狠狠吐槽**：主机收到 App `writeWithResponse` 发下去的蓝牙命令后，**往往根本没有对应的 GATT Write Response 语义上的「命令回执」**——它不跟你握手确认，转头就自顾自 Notify 推数据；App 侧就算打出 `[TX OK]`，也只是手机蓝牙栈说「我写出去了」，**完全不能代表主机说命令对了**。命令到底执行成功还是 silently fail、还是压根没理会，只能靠后续 Notify 内容瞎猜，调试体验极差。

排查收发问题时，在 Metro 里过滤 `[BLE]`，关注 `[TX]`、`[RX]`、`warn` / `error` 即可（见 `services/ble/logger.ts`）。

## 相关文件

| 路径 | 职责 |
|------|------|
| `apps/mobile/src/services/ble/manager.ts` | 连接、扫描、收发、上传 |
| `apps/mobile/src/store/useBleStore.ts` | 跨页面 BLE 状态 |
| `apps/mobile/src/screens/BleDevicesScreen/` | 设备扫描 / 配对 UI |
| `apps/mobile/src/constants/bleCommand.ts` | 命令常量、UUID |
| `apps/mobile/src/utils/bleProtocol.ts` | 帧编解码 |
| `apps/mobile/src/utils/bleDeviceParser.ts` | JSON 传感器解析 |
