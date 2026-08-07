export type BleDevice = {
  id: string;
  name: string;
  rssi: number | null;
};

export type UploadProgress = {
  fileName: string;
  progress: number;
};

export type UploadFileOptions = {
  fileName: string;
  fileData: number[];
  /** 文件名功能码，默认 0xda */
  functionCode?: number;
  chunkSize?: number;
  /** 最后一包使用 0xbc（上传后运行） */
  runAfterUpload?: boolean;
  onProgress?: (progress: UploadProgress) => void;
};

export type DeleteFileOptions = {
  fileName: string;
  functionCode?: number;
};

export type {
  DeviceWatchPayload,
  MatrixControlPayload,
  MotorControlPayload,
  WatchDeviceItem,
} from '@scratch-mobile/protocol';
