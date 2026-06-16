/** 对应电脑端 sign.json，标记当前等待的回复类型 */
export const BLE_SIGN = {
  BOOT_BIN: 'Boot_Bin',
  EXE_FILES: 'Get_FilesOfExe',
} as const;

export type BleSign = (typeof BLE_SIGN)[keyof typeof BLE_SIGN] | null;
