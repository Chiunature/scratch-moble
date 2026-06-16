/**
 * BLE 字节码上传服务（轨道 B：手机 → 主机）。
 *
 * 前置条件（由 UI 层保证，此处二次校验）：
 * 1. 已通过 pikaService.compileGeneratedCode 生成本地字节码
 * 2. 蓝牙已连接 Spark_AI 主机
 *
 * 上传协议对齐 EST-link：FILE_NAME(0xda) 传文件名 → 分包 FILE_DATA(0xaa) 停等 ACK
 * → 末包 LAST_DATA(0xbb)。当前不在上传后自动运行（runAfterUpload: false）。
 */
import { FUNCTION_CODES } from '../../constants/bleCommand';
import { readBytecodeFile } from '../pika/pikaService';
import { bleDeviceManager } from './manager';

/** 主机程序槽位范围；上传文件名为 `{slot}.o`（如 0.o） */
export const HOST_PROGRAM_SLOT_MIN = 0;
export const HOST_PROGRAM_SLOT_MAX = 10;
export const HOST_PROGRAM_SLOT_DEFAULT = 0;

/** 根据槽位生成主机侧文件名，如 slot=0 → `0.o` */
export function buildHostBytecodeFileName(
  slot: number = HOST_PROGRAM_SLOT_DEFAULT,
): string {
  if (
    !Number.isInteger(slot) ||
    slot < HOST_PROGRAM_SLOT_MIN ||
    slot > HOST_PROGRAM_SLOT_MAX
  ) {
    throw new Error(
      `程序槽位须在 ${HOST_PROGRAM_SLOT_MIN}-${HOST_PROGRAM_SLOT_MAX} 之间`,
    );
  }
  return `${slot}.o`;
}

export function clampHostProgramSlot(slot: number): number {
  return Math.min(
    HOST_PROGRAM_SLOT_MAX,
    Math.max(HOST_PROGRAM_SLOT_MIN, Math.trunc(slot)),
  );
}

/** 将 BLE 层错误码映射为用户可读文案 */
export function mapBleUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '上传失败';
  }

  switch (error.message) {
    case 'uploadTimeout':
      return '上传超时（5s 内未收到主机确认），请重试';
    case 'uploadError':
      return '上传失败，主机未确认该帧';
    case 'deviceDisconnected':
      return '蓝牙已断开，上传中断';
    case '已有进行中的上传任务':
      return '已有进行中的上传任务';
    default:
      return error.message || '上传失败';
  }
}

export type UploadBytecodeToHostOptions = {
  /** 本地编译产物路径（通常为 pika-main.py.o） */
  bytecodePath: string;
  /** 主机程序槽 0-10，对应上传文件名 `{slot}.o` */
  programSlot?: number;
  onProgress?: (progress: number) => void;
};

/**
 * 读取本地字节码并通过 BLE 上传到主机指定程序槽。
 * @returns 实际上传的主机文件名（如 `0.o`）
 */
export async function uploadBytecodeToHost(
  options: UploadBytecodeToHostOptions,
): Promise<string> {
  if (!bleDeviceManager.isConnected()) {
    throw new Error('未连接主机，请先在蓝牙设备页连接 Spark_AI');
  }

  const slot = clampHostProgramSlot(
    options.programSlot ?? HOST_PROGRAM_SLOT_DEFAULT,
  );
  const fileName = buildHostBytecodeFileName(slot);
  const fileData = await readBytecodeFile(options.bytecodePath);

  await bleDeviceManager.uploadFile({
    fileName,
    fileData,
    functionCode: FUNCTION_CODES.FILE_NAME,
    runAfterUpload: false,
    onProgress: ({ progress }) => {
      options.onProgress?.(progress);
    },
  });

  return fileName;
}
