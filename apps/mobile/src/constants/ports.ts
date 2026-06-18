/** 传感器接口 A–D（0–3），主机 deviceWatch 仅监控此范围 */
export const SENSOR_PORT_COUNT = 4;

/** 电机接口 E–H（4–7），可选但无主机监控数据 */
export const MOTOR_PORT_COUNT = 4;

export const TOTAL_PORT_COUNT = SENSOR_PORT_COUNT + MOTOR_PORT_COUNT;

export const SENSOR_PORT_LABELS = ['A', 'B', 'C', 'D'] as const;
export const MOTOR_PORT_LABELS = ['E', 'F', 'G', 'H'] as const;

export const PORT_LABELS = [
  ...SENSOR_PORT_LABELS,
  ...MOTOR_PORT_LABELS,
] as const;

export type PortInterfaceKind = 'sensor' | 'motor';

export function isSensorPort(port: number): boolean {
  return port >= 0 && port < SENSOR_PORT_COUNT;
}

export function isMotorPort(port: number): boolean {
  return port >= SENSOR_PORT_COUNT && port < TOTAL_PORT_COUNT;
}

export function formatPortLabel(port: number): string {
  return PORT_LABELS[port] ?? String(port);
}

export function getPortInterfaceKind(port: number): PortInterfaceKind {
  return isMotorPort(port) ? 'motor' : 'sensor';
}
