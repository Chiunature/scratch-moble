import type { SensingDeviceType } from '@scratch-mobile/protocol';
import type { ParsedWatchPort } from '../../../services/ble';
import { tDeviceWatch } from '../i18n/deviceWatchI18n';

export function formatDeviceKindLabel(kind: SensingDeviceType): string {
  return tDeviceWatch(`devices.${kind}`, { defaultValue: kind });
}

export function formatPortReading(port: ParsedWatchPort): string {
  if (port.isAbnormal) {
    return tDeviceWatch('portReading.connectionError');
  }
  if (port.isEmpty) {
    return '—';
  }

  if (port.touch) {
    return port.touch.isPressed
      ? tDeviceWatch('portReading.pressed')
      : tDeviceWatch('portReading.notPressed');
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

export function parseBatteryPercent(
  battery: string | null | undefined,
): number | null {
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
