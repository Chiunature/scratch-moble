import {
  DEVICE_ID_KEYS,
  DEVICE_ID_MAP,
  type DeviceIdKey,
  type SensingDeviceType,
} from '../constants/deviceIdMap';

export type WatchDeviceItem = Record<string, unknown> & {
  port?: number;
  sensing_device?: SensingDeviceType;
  deviceId?: DeviceIdKey | 'dev_null';
  motor?: Record<string, unknown>;
  color?: Record<string, unknown> & { rgb?: string; Not_Run?: unknown };
  gray?: Record<string, unknown>;
  big_motor?: Record<string, unknown>;
  small_motor?: Record<string, unknown>;
  ultrasion?: unknown;
  touch?: unknown;
  gray_v2?: Record<string, unknown>;
  camer?: Record<string, unknown>;
  camera?: Record<string, unknown>;
  nfc?: unknown;
};

/** 主机程序运行状态（deviceWatch JSON 根字段 WillAiState） */
export type HostWillAiState = 'run' | 'stop';

export type DeviceWatchPayload = {
  deviceList: WatchDeviceItem[];
  /** run = 程序运行中，stop = 未运行 */
  WillAiState?: HostWillAiState | string;
  flash?: { total?: string; free?: string };
  adc?: { bat?: string };
  version?: number;
  heap?: string;
};

export function readHostWillAiState(
  payload: DeviceWatchPayload | null | undefined,
): HostWillAiState | undefined {
  const raw = payload?.WillAiState;
  if (raw === 'run' || raw === 'stop') {
    return raw;
  }
  return undefined;
}

const MAX_DEVICE_WATCH_BUFFER_CHARS = 32_768;

function findBalancedJsonEnd(text: string): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

/** 从流式文本缓冲中提取完整的 JSON 对象（主机 notify 可能分包且无换行） */
export function drainDeviceWatchJsonBuffer(buffer: string): {
  remainder: string;
  packets: string[];
} {
  let remainder = buffer;
  const packets: string[] = [];

  while (remainder.length > 0) {
    const start = remainder.indexOf('{');
    if (start === -1) {
      remainder = '';
      break;
    }

    if (start > 0) {
      remainder = remainder.slice(start);
    }

    const end = findBalancedJsonEnd(remainder);
    if (end === -1) {
      break;
    }

    packets.push(remainder.slice(0, end + 1));
    remainder = remainder.slice(end + 1);
  }

  if (remainder.length > MAX_DEVICE_WATCH_BUFFER_CHARS) {
    remainder = '';
  }

  return { remainder, packets };
}

function setDeviceInfo(item: WatchDeviceItem, deviceIdIndex: number): void {
  const key = DEVICE_ID_KEYS[deviceIdIndex];
  item.sensing_device = DEVICE_ID_MAP[key];
  item.deviceId = key;
}

function hasDevNullMarker(item: WatchDeviceItem): boolean {
  return (
    Object.prototype.hasOwnProperty.call(item, 'dev null') ||
    Object.prototype.hasOwnProperty.call(item, 'dev_null')
  );
}

function setDevicePortAbnormal(item: WatchDeviceItem): void {
  item.sensing_device = DEVICE_ID_MAP.dev_null;
  item.deviceId = 'dev_null';
}

function processColorSensor(item: WatchDeviceItem): void {
  setDeviceInfo(item, 2);
  if (item.color && !('Not_Run' in item.color)) {
    const { r, g, b } = item.color as { r: number; g: number; b: number };
    item.color = {
      ...item.color,
      rgb: `rgb(${r >= 255 ? '255' : r}, ${g >= 255 ? '255' : g}, ${
        b >= 255 ? '255' : b
      })`,
    };
  }
}

function processMotor(item: WatchDeviceItem): void {
  item.motor = item.big_motor || item.small_motor;
  const deviceIdIndex = item.big_motor ? 5 : item.small_motor ? 6 : 1;
  setDeviceInfo(item, deviceIdIndex);
}

function processGraySensor(
  item: WatchDeviceItem,
  sourceKey: 'gray' | 'gray_v2',
): void {
  const idKey: DeviceIdKey = sourceKey === 'gray_v2' ? 'b0' : 'a7';
  let idIndex = DEVICE_ID_KEYS.indexOf(idKey);
  if (idIndex < 0) {
    idIndex = sourceKey === 'gray_v2' ? 10 : 7;
  }
  setDeviceInfo(item, idIndex);

  const raw = item[sourceKey];
  if (!raw || typeof raw !== 'object') {
    return;
  }

  const obj: Record<string, unknown> = {
    n: [],
    b: [],
    ...(raw as Record<string, unknown>),
  };

  for (const key of Object.keys(obj)) {
    if (key === 'n' || key === 'b') {
      continue;
    }
    if (/^\d{1}/.test(key)) {
      (obj.n as string[]).push(` ${key}:${obj[key]} `);
      delete obj[key];
    } else if (/b[\d+?]/.test(key)) {
      (obj.b as string[]).push(` ${key}:${obj[key]} `);
      delete obj[key];
    } else if (/^t[1-7]$/i.test(key)) {
      delete obj[key];
    }
  }

  if (Array.isArray(obj.n) && Array.isArray(obj.b)) {
    obj.n = obj.n.join('|');
    obj.b = obj.b.join('|');
  }

  item.gray = { ...obj };
  if (sourceKey === 'gray_v2') {
    delete item.gray_v2;
  }
}

function processCamera(item: WatchDeviceItem): void {
  setDeviceInfo(item, 8);
}

function processNfc(item: WatchDeviceItem): void {
  setDeviceInfo(item, 9);
}

/** 对应电脑端 common.parseDeviceData */
export const parseDeviceData = (raw: string): DeviceWatchPayload | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw.trim()) as DeviceWatchPayload;
    if (
      !parsed?.deviceList ||
      !Array.isArray(parsed.deviceList) ||
      parsed.deviceList.length === 0
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

/** 对应电脑端 common.distinguishDevice */
export const distinguishDevice = (
  watchDeviceData: DeviceWatchPayload,
): DeviceWatchPayload => {
  for (const item of watchDeviceData.deviceList) {
    if (item.color) {
      processColorSensor(item);
    } else if (item.big_motor || item.small_motor) {
      processMotor(item);
    } else if (item.ultrasion) {
      setDeviceInfo(item, 3);
    } else if (item.touch) {
      setDeviceInfo(item, 4);
    } else if (item.gray_v2) {
      processGraySensor(item, 'gray_v2');
    } else if (item.gray) {
      processGraySensor(item, 'gray');
    } else if (item.camer || item.camera) {
      processCamera(item);
    } else if (item.nfc) {
      processNfc(item);
    } else if (hasDevNullMarker(item)) {
      setDevicePortAbnormal(item);
    } else {
      setDeviceInfo(item, 0);
    }
  }

  return { ...watchDeviceData, deviceList: [...watchDeviceData.deviceList] };
};

/** 对应电脑端 initWatchDeviceList */
export const createEmptyWatchDeviceList = (
  portCount: number,
): WatchDeviceItem[] => {
  return Array.from({ length: portCount }, (_, port) => ({
    port,
    motor: {},
    color: {},
    ultrasonic: null,
    touch: null,
    sensing_device: DEVICE_ID_MAP['0'],
    deviceId: '0' as DeviceIdKey,
  }));
};
