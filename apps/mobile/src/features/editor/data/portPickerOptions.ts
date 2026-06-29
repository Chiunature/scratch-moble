/**
 * 端口选择器数据（RN 侧唯一定义）。
 * Web 只接收最终选中的 value；展示与状态均在此维护。
 *
 * - 传感器接口 A–D（0–3）：可结合 deviceWatch 显示连接状态
 * - 电机接口 E–H（4–7）：仅用于积木选口，主机无监控数据
 */

import { getCurrentAppLocale, type AppLocale } from '@scratch-mobile/i18n';

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
} from './deviceWatchDisplay';
import { tEditorOverlay } from '../i18n/editorOverlayI18n';

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

export function getPortStatusLegend(): {
  key: PortConnectionStatus | 'selected' | 'motor';
  label: string;
  color: string;
}[] {
  return [
    {
      key: 'selected',
      label: tEditorOverlay('portPicker.legend.selected'),
      color: portPickerTheme.accent,
    },
    {
      key: 'connected',
      label: tEditorOverlay('portPicker.legend.connected'),
      color: portPickerTheme.connected,
    },
    {
      key: 'warning',
      label: tEditorOverlay('portPicker.legend.warning'),
      color: portPickerTheme.warning,
    },
    {
      key: 'disconnected',
      label: tEditorOverlay('portPicker.legend.disconnected'),
      color: portPickerTheme.disconnected,
    },
    {
      key: 'motor',
      label: tEditorOverlay('portPicker.legend.motor'),
      color: portPickerTheme.textMuted,
    },
  ];
}

function buildMotorPortDefinitions(): PortDefinition[] {
  return MOTOR_PORT_LABELS.map((label, index) => {
    const value = String(SENSOR_PORT_COUNT + index);
    return {
      value,
      label,
      interfaceKind: 'motor' as const,
      connectionStatus: 'disconnected' as const,
      deviceName: tEditorOverlay('portPicker.motorDeviceName', {
        label,
      }),
      deviceType: tEditorOverlay('portPicker.motorInterface'),
      runtimeLabel: tEditorOverlay('portPicker.runtime.noMonitor'),
    };
  });
}

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
  const disconnected = tEditorOverlay('portPicker.runtime.disconnected');
  const connectionError = tEditorOverlay(
    'portPicker.runtime.connectionError',
  );
  const sensorInterface = tEditorOverlay('portPicker.sensorInterface');

  if (!live || live.isEmpty) {
    return {
      value,
      label,
      interfaceKind: 'sensor',
      connectionStatus: 'disconnected',
      deviceName: '—',
      deviceType: disconnected,
      runtimeLabel: disconnected,
    };
  }

  return {
    value,
    label,
    interfaceKind: 'sensor',
    connectionStatus: status,
    deviceName: formatDeviceKindLabel(live.kind),
    deviceType: sensorInterface,
    runtimeLabel:
      status === 'connected'
        ? formatPortReading(live)
        : live.isAbnormal
          ? connectionError
          : disconnected,
  };
}

/** 根据实时传感器数据生成完整端口列表（A–H） */
export function buildPortDefinitions(
  sensorPorts: ParsedWatchPort[] | null | undefined,
): PortDefinition[] {
  const liveByPort = new Map(
    (sensorPorts ?? []).map(port => [port.port, port]),
  );

  const sensorDefinitions = Array.from(
    { length: SENSOR_PORT_COUNT },
    (_, index) => buildSensorPortDefinition(index, liveByPort.get(index)),
  );

  return [...sensorDefinitions, ...buildMotorPortDefinitions()];
}

let cachedDefaultLocale: AppLocale | null = null;
let cachedDefaultPortDefinitions: PortDefinition[] | null = null;

/** 无传感器实时数据时的默认端口列表（按当前语言缓存） */
export function getDefaultPortDefinitions(): PortDefinition[] {
  const locale = getCurrentAppLocale();
  if (cachedDefaultPortDefinitions && cachedDefaultLocale === locale) {
    return cachedDefaultPortDefinitions;
  }
  cachedDefaultLocale = locale;
  cachedDefaultPortDefinitions = buildPortDefinitions(null);
  return cachedDefaultPortDefinitions;
}

export function getPortDefinition(
  value: string,
  definitions: PortDefinition[] = getDefaultPortDefinitions(),
): PortDefinition {
  const fallback = definitions[0] ?? getDefaultPortDefinitions()[0]!;
  return definitions.find(port => port.value === value) ?? fallback;
}

export function isMotorPortValue(value: string): boolean {
  const port = Number(value);
  return (
    !Number.isNaN(port) && port >= SENSOR_PORT_COUNT && port < TOTAL_PORT_COUNT
  );
}
