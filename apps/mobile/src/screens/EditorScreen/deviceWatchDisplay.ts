import type { SensingDeviceType } from '../../constants/deviceIdMap';
import { formatPortLabel } from '../../constants/ports';
import type { ParsedWatchPort } from '../../services/ble';

export { formatPortLabel };

const DEVICE_KIND_LABELS: Record<SensingDeviceType, string> = {
  noDevice: '未连接',
  motor: '电机',
  color: '灰度传感器',
  superSound: '超声波',
  touch: '触摸传感器',
  big_motor: '大电机',
  small_motor: '小电机',
  gray: '灰度传感器',
  deviceAbnormal: '设备异常',
};

export function parseBatteryPercent(battery: string | null | undefined): number | null {
  if (!battery) {
    return null;
  }
  const match = battery.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isNaN(value) ? null : value;
}

export function getBatteryStatusColor(
  percent: number | null,
  isConnected: boolean,
  hasData: boolean,
): string {
  if (!isConnected) {
    return '#94a3b8';
  }
  if (!hasData || percent === null) {
    return '#f59e0b';
  }
  if (percent >= 50) {
    return '#22c55e';
  }
  if (percent >= 20) {
    return '#eab308';
  }
  return '#ef4444';
}

export function formatDeviceKindLabel(kind: SensingDeviceType): string {
  return DEVICE_KIND_LABELS[kind] ?? kind;
}

export function formatPortReading(port: ParsedWatchPort): string {
  if (port.isAbnormal) {
    return '连接异常';
  }
  if (port.isEmpty) {
    return '—';
  }

  if (port.touch) {
    return port.touch.isPressed ? '按下' : '未按下';
  }

  if (port.ultrasonic) {
    if (port.ultrasonic.cm !== null) {
      return `${port.ultrasonic.cm} cm`;
    }
    return '—';
  }

  if (port.grayscaleLux) {
    const { lux, state, min, max, threadValue } = port.grayscaleLux;
    const parts: string[] = [];
    if (lux !== null) {
      parts.push(`lux ${lux}`);
    }
    if (state !== null) {
      parts.push(`state ${state}`);
    }
    if (min !== null) {
      parts.push(`min ${min}`);
    }
    if (max !== null) {
      parts.push(`max ${max}`);
    }
    if (threadValue !== null) {
      parts.push(`threadValue ${threadValue}`);
    }
    return parts.join(' · ') || '—';
  }

  if (port.gray) {
    const parts: string[] = [];
    if (port.gray.n) {
      parts.push(`N ${truncateMiddle(port.gray.n, 28)}`);
    }
    if (port.gray.b) {
      parts.push(`B ${truncateMiddle(port.gray.b, 28)}`);
    }
    return parts.join(' · ') || '—';
  }

  return '—';
}

function truncateMiddle(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}
