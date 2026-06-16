import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BleDevice } from './types';
import { bleLog } from './logger';

const STORAGE_KEY = '@scratch-mobile/paired-ble-devices';

export type PairedBleDevice = BleDevice & {
  pairedAt: number;
};

function normalizeDeviceId(id: string): string {
  //统一转成大写
  return id.toUpperCase();
}

function upsertPairedList(
  list: PairedBleDevice[],
  device: BleDevice,
): PairedBleDevice[] {
  const id = normalizeDeviceId(device.id);
  const next: PairedBleDevice = {
    ...device,
    id,
    pairedAt: Date.now(),
  };
  const index = list.findIndex(item => normalizeDeviceId(item.id) === id);

  if (index === -1) {
    return [next, ...list];
  }

  const updated = [...list];
  updated[index] = { ...updated[index], ...next };
  return updated;
}

export async function loadPairedDevices(): Promise<PairedBleDevice[]> {
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
      id: normalizeDeviceId(item.id),
    }));
  } catch {
    return [];
  }
}

export async function savePairedDevice(
  device: BleDevice,
): Promise<PairedBleDevice[]> {
  const current = await loadPairedDevices();
  const next = upsertPairedList(current, device);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  bleLog.info('已保存配对设备', device.id, device.name);
  return next;
}

export async function removePairedDevice(
  deviceId: string,
): Promise<PairedBleDevice[]> {
  const normalizedId = normalizeDeviceId(deviceId);
  const current = await loadPairedDevices();
  const next = current.filter(
    item => normalizeDeviceId(item.id) !== normalizedId,
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  bleLog.info('已移除配对设备', normalizedId);
  return next;
}

export function isDeviceInScanList(
  pairedId: string,
  scannedDevices: BleDevice[],
): boolean {
  const normalizedId = normalizeDeviceId(pairedId);
  // 检查到是否有一个包含的就马上返回true，不然就是false
  return scannedDevices.some(
    device => normalizeDeviceId(device.id) === normalizedId,
  );
}
