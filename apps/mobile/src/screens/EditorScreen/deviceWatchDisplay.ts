import { formatPortLabel } from '@scratch-mobile/shared';

export {
  formatDeviceKindLabel,
  formatPortReading,
} from '../../features/editor/data/deviceWatchDisplay';

export { formatPortLabel };

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
