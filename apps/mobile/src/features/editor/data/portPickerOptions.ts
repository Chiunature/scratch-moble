/**
 * 端口选择器数据（RN 侧唯一定义）。
 * Web 只接收最终选中的 value；展示与状态均在此维护。
 */

import { portPickerTheme } from '../../../theme';

export type PortConnectionStatus = 'connected' | 'warning' | 'disconnected';

export type PortDefinition = {
  value: string;
  label: string;
  connectionStatus: PortConnectionStatus;
  deviceName: string;
  deviceType: string;
  dataRate: string;
  signalPercent: number;
  runtimeLabel: string;
};

export { portPickerTheme };

export const PORT_STATUS_LEGEND: {
  key: PortConnectionStatus | 'selected';
  label: string;
  color: string;
}[] = [
  { key: 'selected', label: '已选中', color: portPickerTheme.accent },
  { key: 'connected', label: '已连接', color: portPickerTheme.connected },
  { key: 'warning', label: '警告', color: portPickerTheme.warning },
  { key: 'disconnected', label: '未连接', color: portPickerTheme.disconnected },
];

export const PORT_DEFINITIONS: PortDefinition[] = [
  {
    value: '0',
    label: 'A',
    connectionStatus: 'disconnected',
    deviceName: '—',
    deviceType: '未连接',
    dataRate: '—',
    signalPercent: 0,
    runtimeLabel: '未连接',
  },
  {
    value: '1',
    label: 'B',
    connectionStatus: 'connected',
    deviceName: '电机 A',
    deviceType: '直流电机',
    dataRate: '115200 bps',
    signalPercent: 72,
    runtimeLabel: '正常运行',
  },
  {
    value: '2',
    label: 'C',
    connectionStatus: 'connected',
    deviceName: '电机 B',
    deviceType: '直流电机',
    dataRate: '115200 bps',
    signalPercent: 68,
    runtimeLabel: '正常运行',
  },
  {
    value: '3',
    label: 'D',
    connectionStatus: 'connected',
    deviceName: '超声波',
    deviceType: '距离传感器',
    dataRate: '9600 bps',
    signalPercent: 81,
    runtimeLabel: '正常运行',
  },
  {
    value: '4',
    label: 'E',
    connectionStatus: 'warning',
    deviceName: '陀螺仪',
    deviceType: '惯性传感器',
    dataRate: '400 kHz',
    signalPercent: 45,
    runtimeLabel: '信号偏弱',
  },
  {
    value: '5',
    label: 'F',
    connectionStatus: 'connected',
    deviceName: '蜂鸣器',
    deviceType: '音频输出',
    dataRate: '9600 bps',
    signalPercent: 90,
    runtimeLabel: '正常运行',
  },
  {
    value: '6',
    label: 'G',
    connectionStatus: 'connected',
    deviceName: 'RGB 灯',
    deviceType: '灯矩阵',
    dataRate: '1 Mbps',
    signalPercent: 88,
    runtimeLabel: '正常运行',
  },
  {
    value: '7',
    label: 'H',
    connectionStatus: 'disconnected',
    deviceName: '—',
    deviceType: '未连接',
    dataRate: '—',
    signalPercent: 0,
    runtimeLabel: '未连接',
  },
];

export function getPortDefinition(value: string): PortDefinition {
  return PORT_DEFINITIONS.find(p => p.value === value) ?? PORT_DEFINITIONS[0];
}
