import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BleDevice } from '../types';
import { bleLog } from '../core/logger';

const STORAGE_KEY = '@scratch-mobile/paired-ble-devices';

export type PairedBleDevice = BleDevice & {
  pairedAt: number;
};

/** 配对列表变更订阅：store 投影依赖此事件与持久化保持一致 */
type PairedDevicesListener = (list: PairedBleDevice[]) => void;
const pairedDevicesListeners = new Set<PairedDevicesListener>();

export function subscribePairedDevices(
  listener: PairedDevicesListener,
): () => void {
  pairedDevicesListeners.add(listener);
  return () => {
    pairedDevicesListeners.delete(listener);
  };
}

function emitPairedDevices(list: PairedBleDevice[]): void {
  for (const listener of pairedDevicesListeners) {
    listener(list);
  }
}

export function normalizeBleDeviceId(id: string): string {
  return id.toUpperCase();
}

export function normalizeBleDevice(device: BleDevice): BleDevice {
  return {
    ...device,
    id: normalizeBleDeviceId(device.id),
  };
}

function upsertPairedList(
  list: PairedBleDevice[],
  device: BleDevice,
): PairedBleDevice[] {
  const id = normalizeBleDeviceId(device.id);
  const next: PairedBleDevice = {
    ...device,
    id,
    pairedAt: Date.now(),
  };
  const index = list.findIndex(item => normalizeBleDeviceId(item.id) === id);

  if (index === -1) {
    return [next, ...list];
  }

  const updated = [...list];
  updated[index] = { ...updated[index], ...next };
  return updated;
}

/** 内部读取：不通知订阅者（save/remove 会随后 emit 最终列表） */
async function readPairedDevices(): Promise<PairedBleDevice[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PairedBleDevice[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(item => ({
      ...item,
      id: normalizeBleDeviceId(item.id),
    }));
  } catch {
    return [];
  }
}

export async function loadPairedDevices(): Promise<PairedBleDevice[]> {
  const list = await readPairedDevices();
  // 读取即重同步订阅者（初始化 / 屏幕聚焦刷新时 store 投影随之更新）
  emitPairedDevices(list);
  return list;
}

export async function savePairedDevice(
  device: BleDevice,
): Promise<PairedBleDevice[]> {
  const current = await readPairedDevices();
  const next = upsertPairedList(current, device);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  bleLog.info('已保存配对设备', device.id, device.name);
  emitPairedDevices(next);
  return next;
}

export async function removePairedDevice(
  deviceId: string,
): Promise<PairedBleDevice[]> {
  const normalizedId = normalizeBleDeviceId(deviceId);
  const current = await readPairedDevices();
  const next = current.filter(
    item => normalizeBleDeviceId(item.id) !== normalizedId,
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  bleLog.info('已移除配对设备', normalizedId);
  emitPairedDevices(next);
  return next;
}

export function isDeviceInScanList(
  pairedId: string,
  scannedDevices: BleDevice[],
): boolean {
  const normalizedId = normalizeBleDeviceId(pairedId);
  return scannedDevices.some(
    device => normalizeBleDeviceId(device.id) === normalizedId,
  );
}
