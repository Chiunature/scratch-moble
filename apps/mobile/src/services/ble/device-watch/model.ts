import type { DeviceIdKey, SensingDeviceType } from '../../../constants/deviceIdMap';
import type {
  DeviceWatchPayload,
  HostWillAiState,
  WatchDeviceItem,
} from '../../../utils/bleDeviceParser';
import { readHostWillAiState } from '../../../utils/bleDeviceParser';

/** 触摸传感器快照 */
export type TouchSensorSnapshot = {
  state: number | null;
  /** state !== 0 视为按下 */
  isPressed: boolean;
};

/** 超声波传感器快照（主机字段名为 ultrasion） */
export type UltrasonicSensorSnapshot = {
  cm: number | null;
  /** 255 通常表示超出量程 */
  isOutOfRange: boolean;
};

/** 主机 a2 / sensing_device:"color" 实为灰度传感器，JSON 字段名仍为 color */
export type GrayscaleLuxSnapshot = {
  lux: number | null;
  state: number | null;
  min: number | null;
  max: number | null;
  threadValue: number | null;
  /** 传感器是否在运行（无 Not_Run 标记时为 true） */
  isRunning: boolean;
};

/** @deprecated 请用 GrayscaleLuxSnapshot；主机 color 字段实为灰度 lux */
export type ColorSensorSnapshot = GrayscaleLuxSnapshot;

/** 多通道灰度传感器快照（a7 gray） */
export type GraySensorSnapshot = {
  n: string | null;
  b: string | null;
  raw: Record<string, unknown>;
};

/** 灰度类传感器在主机侧的 sensing_device 取值 */
export const GRAYSCALE_SENSOR_KINDS = ['color', 'gray'] as const;

export type GrayscaleSensorKind = (typeof GRAYSCALE_SENSOR_KINDS)[number];

export function isGrayscaleSensorKind(
  kind: SensingDeviceType,
): kind is GrayscaleSensorKind {
  return (GRAYSCALE_SENSOR_KINDS as readonly SensingDeviceType[]).includes(kind);
}

/** 拆解后的单端口视图 */
export type ParsedWatchPort = {
  port: number;
  deviceId: DeviceIdKey | 'dev_null';
  /** 对应 sensing_device 字段 */
  kind: SensingDeviceType;
  /** sensing_device === 'noDevice'，端口无设备 */
  isEmpty: boolean;
  /** 端口有设备（含 deviceAbnormal） */
  isConnected: boolean;
  /** sensing_device === 'deviceAbnormal' */
  isAbnormal: boolean;

  /** 是否为灰度类传感器（含主机误标为 color 的 lux 传感器） */
  isGrayscaleSensor: boolean;

  /** 主机 color 字段 → 实为灰度 lux 读数 */
  grayscaleLux?: GrayscaleLuxSnapshot;
  motor?: Record<string, unknown>;
  /** a7 多通道灰度 */
  gray?: GraySensorSnapshot;
  ultrasonic?: UltrasonicSensorSnapshot;
  touch?: TouchSensorSnapshot;

  /** distinguishDevice 处理后的原始条目 */
  raw: WatchDeviceItem;
};

/** 拆解后的 deviceWatch 视图 */
export type ParsedDeviceWatch = {
  raw: DeviceWatchPayload;
  willAiState: HostWillAiState | undefined;
  isProgramRunning: boolean;
  battery: string | null;
  flash: { total: string; free: string } | null;
  version: number | null;
  heap: string | null;
  portCount: number;
  ports: ParsedWatchPort[];
  connectedPorts: ParsedWatchPort[];
  emptyPorts: ParsedWatchPort[];
};

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function extractPortPayload(item: WatchDeviceItem): Record<string, unknown> {
  const payload = { ...item };
  delete payload.port;
  delete payload.sensing_device;
  delete payload.deviceId;
  return payload;
}

function parseGrayscaleLux(
  color: Record<string, unknown> | undefined,
): GrayscaleLuxSnapshot | undefined {
  if (!color) {
    return undefined;
  }

  return {
    lux: parseNumericValue(color.lux),
    state: parseNumericValue(color.state),
    min: parseNumericValue(color.min),
    max: parseNumericValue(color.max),
    threadValue: parseNumericValue(color.threadValue),
    isRunning: !('Not_Run' in color),
  };
}

function parseGraySensor(
  gray: Record<string, unknown> | undefined,
): GraySensorSnapshot | undefined {
  if (!gray) {
    return undefined;
  }

  return {
    n: typeof gray.n === 'string' ? gray.n : null,
    b: typeof gray.b === 'string' ? gray.b : null,
    raw: { ...gray },
  };
}

function parseTouchSensor(touch: unknown): TouchSensorSnapshot | undefined {
  if (!touch || typeof touch !== 'object') {
    return undefined;
  }

  const state = parseNumericValue((touch as Record<string, unknown>).state);
  return {
    state,
    isPressed: state !== null && state !== 0,
  };
}

function parseUltrasonicSensor(
  ultrasion: unknown,
): UltrasonicSensorSnapshot | undefined {
  if (!ultrasion || typeof ultrasion !== 'object') {
    return undefined;
  }

  const cm = parseNumericValue((ultrasion as Record<string, unknown>).cm);
  return {
    cm,
    isOutOfRange: cm === 255,
  };
}

/** 拆解单个端口条目 */
export function parseWatchPort(item: WatchDeviceItem, index: number): ParsedWatchPort {
  const port = typeof item.port === 'number' ? item.port : index;
  const kind: SensingDeviceType = item.sensing_device ?? 'noDevice';
  const isEmpty = kind === 'noDevice';
  const isAbnormal = kind === 'deviceAbnormal';
  const isConnected = !isEmpty;

  const parsed: ParsedWatchPort = {
    port,
    deviceId: item.deviceId ?? '0',
    kind,
    isEmpty,
    isConnected,
    isAbnormal,
    isGrayscaleSensor: isGrayscaleSensorKind(kind),
    raw: item,
  };

  if (!isConnected) {
    return parsed;
  }

  const grayscaleLux = parseGrayscaleLux(item.color);
  if (grayscaleLux) {
    parsed.grayscaleLux = grayscaleLux;
  }

  const motor = item.motor ?? item.big_motor ?? item.small_motor;
  if (motor && typeof motor === 'object') {
    parsed.motor = { ...(motor as Record<string, unknown>) };
  }

  const gray = parseGraySensor(item.gray);
  if (gray) {
    parsed.gray = gray;
  }

  if (item.ultrasion !== undefined) {
    const ultrasonic = parseUltrasonicSensor(item.ultrasion);
    if (ultrasonic) {
      parsed.ultrasonic = ultrasonic;
    }
  }

  if (item.touch !== undefined) {
    const touch = parseTouchSensor(item.touch);
    if (touch) {
      parsed.touch = touch;
    }
  }

  if (
    !parsed.grayscaleLux &&
    !parsed.motor &&
    !parsed.gray &&
    parsed.ultrasonic === undefined &&
    parsed.touch === undefined
  ) {
    const fallback = extractPortPayload(item);
    if (Object.keys(fallback).length > 0) {
      parsed.motor = fallback;
    }
  }

  return parsed;
}

/** 拆解完整 deviceWatch 载荷 */
export function parseDeviceWatch(payload: DeviceWatchPayload): ParsedDeviceWatch {
  const ports = payload.deviceList.map((item, index) => parseWatchPort(item, index));
  const willAiState = readHostWillAiState(payload);

  return {
    raw: payload,
    willAiState,
    isProgramRunning: willAiState === 'run',
    battery: payload.adc?.bat ?? null,
    flash: payload.flash
      ? {
          total: payload.flash.total ?? '',
          free: payload.flash.free ?? '',
        }
      : null,
    version: typeof payload.version === 'number' ? payload.version : null,
    heap: payload.heap ?? null,
    portCount: ports.length,
    ports,
    connectedPorts: ports.filter(port => port.isConnected),
    emptyPorts: ports.filter(port => port.isEmpty),
  };
}

export function getWatchGrayscalePorts(
  watch: ParsedDeviceWatch | null | undefined,
): ParsedWatchPort[] {
  return watch?.ports.filter(port => port.isGrayscaleSensor) ?? [];
}

export function getWatchPortsByKind(
  watch: ParsedDeviceWatch | null | undefined,
  kind: SensingDeviceType,
): ParsedWatchPort[] {
  return watch?.ports.filter(port => port.kind === kind) ?? [];
}

export function getWatchPort(
  watch: ParsedDeviceWatch | null | undefined,
  port: number,
): ParsedWatchPort | undefined {
  return watch?.ports.find(item => item.port === port);
}

export function isWatchPortConnected(
  watch: ParsedDeviceWatch | null | undefined,
  port: number,
): boolean {
  return getWatchPort(watch, port)?.isConnected ?? false;
}

export function isWatchPortEmpty(
  watch: ParsedDeviceWatch | null | undefined,
  port: number,
): boolean {
  return getWatchPort(watch, port)?.isEmpty ?? true;
}
