/** 对应电脑端 instructions.js deviceIdMap */
export const DEVICE_ID_MAP = {
  '0': 'noDevice',
  a1: 'motor',
  a2: 'color',
  a3: 'superSound',
  a4: 'touch',
  a5: 'big_motor',
  a6: 'small_motor',
  a7: 'gray',
  a8: 'camer',
  a9: 'nfc',
  b0: 'gray_v2',
  dev_null: 'deviceAbnormal',
} as const;

export type DeviceIdKey = keyof typeof DEVICE_ID_MAP;
export type SensingDeviceType = (typeof DEVICE_ID_MAP)[DeviceIdKey];

export const DEVICE_ID_KEYS = Object.keys(DEVICE_ID_MAP) as DeviceIdKey[];
