/** 对应电脑端 instructions.js deviceIdMap */
export const DEVICE_ID_MAP = {
  '0': 'noDevice',
  a1: 'motor',
  a2: 'color', // 主机遗留命名，实为灰度传感器（lux），见 codegen gray_sensor → _color
  a3: 'superSound',
  a4: 'touch',
  a5: 'big_motor',
  a6: 'small_motor',
  a7: 'gray',
  dev_null: 'deviceAbnormal',
} as const;

export type DeviceIdKey = keyof typeof DEVICE_ID_MAP;
export type SensingDeviceType = (typeof DEVICE_ID_MAP)[DeviceIdKey];

export const DEVICE_ID_KEYS = Object.keys(DEVICE_ID_MAP) as DeviceIdKey[];
