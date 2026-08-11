/**
 * BLE 上传会话：独立收纳上传帧队列、进度回调、Promise 结算、超时定时器与
 * 完成/取消路径。manager 仅持有实例并委托，自身不再维护上传状态。
 */
import {
  BLE_UPLOAD_CHUNK_SIZE,
  BLE_UPLOAD_TIMEOUT_MS,
} from '../../../constants/bleCommand';
import {
  FUNCTION_CODES,
  buildUploadFrames,
  verifyBootFrame,
} from '@scratch-mobile/protocol';
import { bleLog } from './logger';
import type { UploadFileOptions, UploadProgress } from '../types';

export type UploadSessionDeps = {
  /** 上传专用 GATT 写入（manager 提供；含 BOOT_BIN 签名设置） */
  writeUploadFrame: (command: number[]) => Promise<void>;
  /** 相位转换：uploading 无条件；connected 由 manager 依据连接状态决定 */
  transition: (phase: 'uploading' | 'connected') => void;
  /** 上传结束/取消时重置 BOOT_BIN 接收态标识（与 EXE_FILES 共用 sign） */
  resetBootSign: () => void;
};

export class UploadSession {
  private frames: number[][] = [];
  private frameIndex = 0;
  private totalFrames = 0;
  private fileName = '';
  private onProgress: ((progress: UploadProgress) => void) | null = null;
  private resolve: (() => void) | null = null;
  private reject: ((error: Error) => void) | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly deps: UploadSessionDeps) {}

  /** 上传是否进行中（manager 的 isBinaryMode / BOOT_BIN ACK 分发依赖） */
  isActive(): boolean {
    return this.reject !== null;
  }

  /** 开始上传：建帧 → 置 uploading 相位 → 首包发送（ACK 驱动后续分包） */
  async start(options: UploadFileOptions): Promise<void> {
    if (this.isActive()) {
      throw new Error('uploadInProgress');
    }

    const {
      fileName,
      fileData,
      functionCode = FUNCTION_CODES.FILE_NAME,
      chunkSize = BLE_UPLOAD_CHUNK_SIZE,
      runAfterUpload = false,
      onProgress,
    } = options;

    bleLog.info('开始上传文件', {
      fileName,
      bytes: fileData.length,
      chunkSize,
      runAfterUpload,
    });

    this.frames = buildUploadFrames(
      fileName,
      fileData,
      functionCode,
      chunkSize,
      runAfterUpload,
    );
    this.totalFrames = this.frames.length;
    this.fileName = fileName;
    this.onProgress = onProgress ?? null;
    this.deps.transition('uploading');

    bleLog.info(`上传分包数: ${this.totalFrames}`);

    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      void this.sendFrameAt(0);
    });
  }

  /** 收到 BOOT_BIN ACK 帧：校验 → 进度 → 下一帧或完成 */
  handleAck(data: number[]): void {
    if (!verifyBootFrame(data)) {
      bleLog.error('上传 ACK 校验失败');
      this.cancel(new Error('uploadError'));
      return;
    }

    this.clearTimeout();
    const nextIndex = this.frameIndex + 1;
    const progress = Math.ceil((nextIndex / this.totalFrames) * 100);
    bleLog.info(`上传进度 ${progress}% (${nextIndex}/${this.totalFrames})`);
    this.onProgress?.({
      fileName: this.fileName,
      progress,
    });

    if (nextIndex >= this.totalFrames) {
      bleLog.info('上传完成', this.fileName);
      this.finish();
      return;
    }

    void this.sendFrameAt(nextIndex);
  }

  /** 断开 / 销毁 / ACK 校验失败时取消上传 */
  cancel(error: Error): void {
    const hadActiveUpload = this.reject !== null;
    this.clearTimeout();
    this.resetState();
    const reject = this.reject;
    this.resolve = null;
    this.reject = null;

    if (!hadActiveUpload) {
      return;
    }

    if (error.message === 'deviceDisconnected') {
      bleLog.info('上传因断开而中断');
    } else {
      bleLog.warn('上传取消', error.message);
    }
    this.deps.transition('connected');
    reject?.(error);
  }

  private async sendFrameAt(index: number): Promise<void> {
    this.frameIndex = index;
    this.resetTimeout();
    bleLog.info(`上传分包 ${index + 1}/${this.totalFrames}`);

    try {
      await this.deps.writeUploadFrame(this.frames[index]);
    } catch (error) {
      bleLog.error('上传分包发送失败', error);
      this.cancel(error instanceof Error ? error : new Error('uploadError'));
    }
  }

  private finish(): void {
    this.clearTimeout();
    this.resetState();
    this.deps.transition('connected');
    const resolve = this.resolve;
    this.resolve = null;
    this.reject = null;
    resolve?.();
  }

  private resetState(): void {
    this.onProgress = null;
    this.frames = [];
    this.deps.resetBootSign();
  }

  private resetTimeout(): void {
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      bleLog.warn('上传超时');
      this.cancel(new Error('uploadTimeout'));
    }, BLE_UPLOAD_TIMEOUT_MS);
  }

  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}