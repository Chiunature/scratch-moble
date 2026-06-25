/** 传感器接口 A–D（0–3），电机接口 E–H（4–7） */
export const SENSOR_PORT_COUNT = 4;
export const MOTOR_PORT_COUNT = 4;
export const TOTAL_PORT_COUNT = SENSOR_PORT_COUNT + MOTOR_PORT_COUNT;

export const SENSOR_PORT_LABELS = ['A', 'B', 'C', 'D'] as const;
export const MOTOR_PORT_LABELS = ['E', 'F', 'G', 'H'] as const;

export const PORT_LABELS = [
  ...SENSOR_PORT_LABELS,
  ...MOTOR_PORT_LABELS,
] as const;

/** 端口编号 → 显示字母（A–H），无效编号原样返回字符串。 */
export function formatPortLabel(port: number | string): string {
  const index = typeof port === 'string' ? Number(port) : port;
  if (Number.isInteger(index) && index >= 0 && index < PORT_LABELS.length) {
    return PORT_LABELS[index]!;
  }
  return String(port);
}
