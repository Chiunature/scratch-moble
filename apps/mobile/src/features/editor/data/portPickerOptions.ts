/**
 * 端口选择器数据（RN 侧唯一定义）。
 * Web 只接收最终选中的 value；展示与状态均在此维护。
 *
 * - 传感器接口 A–D（0–3）：可结合 deviceWatch 显示连接状态
 * - 电机接口 E–H（4–7）：仅用于积木选口，主机无监控数据
 */

import type { ParsedWatchPort } from '../../../services/ble';
import {
  MOTOR_PORT_LABELS,
  SENSOR_PORT_COUNT,
  SENSOR_PORT_LABELS,
  TOTAL_PORT_COUNT,
  type PortInterfaceKind,
} from '../../../constants/ports';
import { portPickerTheme } from '../../../theme';
import {
  formatDeviceKindLabel,
  formatPortReading,
} from '../../../screens/EditorScreen/deviceWatchDisplay';

export type { PortInterfaceKind };

export type PortConnectionStatus = 'connected' | 'warning' | 'disconnected';

export type PortDefinition = {
  value: string;
  label: string;
  interfaceKind: PortInterfaceKind;
  connectionStatus: PortConnectionStatus;
  deviceName: string;
  deviceType: string;
  runtimeLabel: string;
};

export { portPickerTheme };

export const PORT_STATUS_LEGEND: {
  key: PortConnectionStatus | 'selected' | 'motor';
  label: string;
  color: string;
}[] = [
  { key: 'selected', label: '已选中', color: portPickerTheme.accent },
  { key: 'connected', label: '已连接', color: portPickerTheme.connected },
  { key: 'warning', label: '异常', color: portPickerTheme.warning },
  { key: 'disconnected', label: '未连接', color: portPickerTheme.disconnected },
  { key: 'motor', label: '电机口', color: portPickerTheme.textMuted },
];

const STATIC_MOTOR_PORT_DEFINITIONS: PortDefinition[] = MOTOR_PORT_LABELS.map(
  (label, index) => {
    const value = String(SENSOR_PORT_COUNT + index);
    return {
      value,
      label,
      interfaceKind: 'motor' as const,
      connectionStatus: 'disconnected' as const,
      deviceName: `电机 ${label}`,
      deviceType: '电机接口',
      runtimeLabel: '无监控数据',
    };
  },
);

function sensorStatusFromPort(
  port: ParsedWatchPort | undefined,
): PortConnectionStatus {
  if (!port || port.isEmpty) {
    return 'disconnected';
  }
  if (port.isAbnormal) {
    return 'warning';
  }
  return 'connected';
}

function buildSensorPortDefinition(
  portIndex: number,
  live?: ParsedWatchPort,
): PortDefinition {
  const label = SENSOR_PORT_LABELS[portIndex] ?? String(portIndex);
  const value = String(portIndex);
  const status = sensorStatusFromPort(live);

  if (!live || live.isEmpty) {
    return {
      value,
      label,
      interfaceKind: 'sensor',
      connectionStatus: 'disconnected',
      deviceName: '—',
      deviceType: '未连接',
      runtimeLabel: '未连接',
    };
  }

  return {
    value,
    label,
    interfaceKind: 'sensor',
    connectionStatus: status,
    deviceName: formatDeviceKindLabel(live.kind),
    deviceType: '传感器接口',
    runtimeLabel:
      status === 'connected' ? formatPortReading(live) : live.isAbnormal ? '连接异常' : '未连接',
  };
}

/** 根据实时传感器数据生成完整端口列表（A–H） */
export function buildPortDefinitions(
  sensorPorts: ParsedWatchPort[] | null | undefined,
): PortDefinition[] {
  const liveByPort = new Map(
    (sensorPorts ?? []).map(port => [port.port, port]),
  );

  const sensorDefinitions = Array.from({ length: SENSOR_PORT_COUNT }, (_, index) =>
    buildSensorPortDefinition(index, liveByPort.get(index)),
  );

  return [...sensorDefinitions, ...STATIC_MOTOR_PORT_DEFINITIONS];
}

/** 无实时数据时的默认端口列表 */
export const PORT_DEFINITIONS = buildPortDefinitions(null);

export const SENSOR_PORT_DEFINITIONS = PORT_DEFINITIONS.slice(0, SENSOR_PORT_COUNT);
export const MOTOR_PORT_DEFINITIONS = PORT_DEFINITIONS.slice(SENSOR_PORT_COUNT);

export function getPortDefinition(
  value: string,
  definitions: PortDefinition[] = PORT_DEFINITIONS,
): PortDefinition {
  return (
    definitions.find(port => port.value === value) ??
    definitions[0] ??
    PORT_DEFINITIONS[0]!
  );
}

export function isMotorPortValue(value: string): boolean {
  const port = Number(value);
  return !Number.isNaN(port) && port >= SENSOR_PORT_COUNT && port < TOTAL_PORT_COUNT;
}
