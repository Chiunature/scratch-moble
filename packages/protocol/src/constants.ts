/**
 * 硬件协议常量（对应电脑端 instructions.js / sign.json）。
 * 预编译指令帧与设备标识均为协议固有知识，与 RN/BLE 连接参数分离。
 */

/** 指令帧（对应电脑端 instructions.js，帧尾校验和已预编译） */
export const COMMANDS = {
  version: [0x5a, 0x97, 0x98, 0x01, 0xea, 0x01, 0x75, 0xa5],
  files: [0x5a, 0x97, 0x98, 0x01, 0xe7, 0x01, 0x72, 0xa5],
  app_run: [0x5a, 0x97, 0x98, 0x01, 0xb6, 0x01, 0x41, 0xa5],
  app_stop: [0x5a, 0x97, 0x98, 0x01, 0xb9, 0x01, 0x44, 0xa5],
  restart: [0x5a, 0x97, 0x98, 0x01, 0xb7, 0x01, 0x42, 0xa5],
  serialport: [0x5a, 0x97, 0x98, 0x01, 0xb8, 0x01, 0x43, 0xa5],
  sensing_update: [0x5a, 0x97, 0x98, 0x01, 0xd0, 0x01, 0x5b, 0xa5],
  stop_watch: [0x5a, 0x97, 0x98, 0x01, 0xba, 0x01, 0x45, 0xa5],
  calibration: [0x5a, 0x97, 0x98, 0x01, 0x7f, 0x01, 0x0a, 0xa5],
  matrix_clear: [0x5a, 0x97, 0x98, 0x01, 0xee, 0x01, 0x79, 0xa5],
} as const;

export const FUNCTION_CODES = {
  FILE_NAME: 0xda,
  FILE_DATA: 0xaa,
  LAST_DATA: 0xbb,
  LAST_DATA_RUN: 0xbc,
  DELETE: 0xe8,
  RESET: 0x6f,
  FILE_LIST_RESPONSE: 0x7f,
} as const;

/** 主机 BLE 服务/特征（Spark_AI） */
export const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';

/** 对应电脑端 sign.json，标记当前等待的回复类型 */
export const BLE_SIGN = {
  BOOT_BIN: 'Boot_Bin',
  EXE_FILES: 'Get_FilesOfExe',
} as const;

export type BleSign = (typeof BLE_SIGN)[keyof typeof BLE_SIGN] | null;

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