import { useMemo } from 'react';

import { useBleStore } from '../../../store/useBleStore';
import type { DeviceWatchPayload } from '../../../utils/bleDeviceParser';
import {
  getWatchPort,
  isWatchPortConnected,
  isWatchPortEmpty,
  parseDeviceWatch,
  type ParsedDeviceWatch,
  type ParsedWatchPort,
} from './model';

export type DeviceWatchHookState = {
  /** 原始 deviceWatch（未拆解） */
  raw: DeviceWatchPayload | null;
  /** 拆解后的视图；无数据时为 null */
  watch: ParsedDeviceWatch | null;
  isAvailable: boolean;

  portCount: number;
  ports: ParsedWatchPort[];
  connectedPorts: ParsedWatchPort[];
  emptyPorts: ParsedWatchPort[];
  sensorPorts: ParsedWatchPort[];
  sensorConnectedPorts: ParsedWatchPort[];
  sensorPortCount: number;

  getPort: (port: number) => ParsedWatchPort | undefined;
  isPortConnected: (port: number) => boolean;
  isPortEmpty: (port: number) => boolean;
};

export function useDeviceWatch(): DeviceWatchHookState {
  const raw = useBleStore(state => state.deviceWatch);

  const watch = useMemo(
    () => (raw ? parseDeviceWatch(raw) : null),
    [raw],
  );

  return useMemo(
    (): DeviceWatchHookState => ({
      raw,
      watch,
      isAvailable: watch !== null,
      portCount: watch?.portCount ?? 0,
      ports: watch?.ports ?? [],
      connectedPorts: watch?.connectedPorts ?? [],
      emptyPorts: watch?.emptyPorts ?? [],
      sensorPorts: watch?.sensorPorts ?? [],
      sensorConnectedPorts: watch?.sensorConnectedPorts ?? [],
      sensorPortCount: watch?.sensorPortCount ?? 4,
      getPort: (port: number) => getWatchPort(watch, port),
      isPortConnected: (port: number) => isWatchPortConnected(watch, port),
      isPortEmpty: (port: number) => isWatchPortEmpty(watch, port),
    }),
    [raw, watch],
  );
}
