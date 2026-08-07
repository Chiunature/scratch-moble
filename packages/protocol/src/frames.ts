/**
 * BLE 指令帧编解码（对应电脑端 common.js）。
 * 纯字节逻辑，无 RN 依赖；帧头 0x5a 0x97 0x98，帧尾校验和 + 0xa5。
 */

export type ParsedFrame = {
  /** 完整帧字节 */
  data: number[];
  /** 功能码（帧第 5 字节） */
  bit: number;
  frameLength: number;
  startIndex: number;
};

export const calculateChecksum = (data: number[]): number => {
  let sum = 0;
  data.forEach(item => {
    sum += item;
  });
  return sum & 0xff;
};

export const buildCommand = (data: number[], cmd: number): number[] => {
  const len = data.length;
  const header = [0x5a, 0x97, 0x98];
  const payload = [len, cmd, ...data];
  const checksum = calculateChecksum([...header, ...payload]);

  return [...header, ...payload, checksum, 0xa5];
};

export const stringToHex = (str: string): number[] => {
  return str.split('').map(char => char.charCodeAt(0));
};

export const hexToString = (hexArray: number[]): string => {
  return String.fromCharCode(...hexArray);
};

/** 对应电脑端 common.checkFileName */
export const checkFileName = (
  fileName: string,
  functionCode: number,
): number[] => {
  const list = stringToHex(fileName);
  const len = list.length;
  let sum = 0x5a + 0x97 + 0x98 + len + functionCode;
  list.forEach(el => {
    sum += el;
  });
  return [0x5a, 0x97, 0x98, len, functionCode, ...list, sum & 0xff, 0xa5];
};

/** 对应电脑端 common.checkBinData */
export const checkBinData = (
  chunk: number[],
  isLast: boolean,
  runAfterUpload = false,
): number[] => {
  const len = chunk.length;
  const bits = isLast
    ? runAfterUpload
      ? 0xbc
      : 0xbb
    : 0xaa;
  let sum = 0x5a + 0x97 + 0x98 + len + bits;
  chunk.forEach(el => {
    sum += el;
  });
  return [0x5a, 0x97, 0x98, len, bits, ...chunk, sum & 0xff, 0xa5];
};

/** 对应电脑端 common.uploadSlice */
export const uploadSlice = (data: number[], size: number): number[][] => {
  if (data.length <= size) {
    return [data];
  }

  const chunks: number[][] = [];
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, i + size));
  }
  return chunks;
};

/** 对应电脑端 common.handleDataOfUpload（BLE 128 字节分包） */
export const buildUploadFrames = (
  fileName: string,
  fileData: number[],
  functionCode: number,
  chunkSize: number,
  runAfterUpload: boolean,
): number[][] => {
  const slices = uploadSlice(fileData, chunkSize);
  const dataFrames = slices.map((chunk, index) =>
    checkBinData(chunk, index === slices.length - 1, runAfterUpload),
  );
  const nameFrame = checkFileName(fileName, functionCode);
  return [nameFrame, ...dataFrames];
};

/**
 * 对应电脑端 common.catchData，从 buffer 中提取一帧完整数据。
 * 帧不完整时返回 null，不消费 buffer。
 */
export const catchData = (buffer: number[]): ParsedFrame | null => {
  const start = buffer.indexOf(0x5a);
  if (start === -1) {
    return null;
  }

  const b1 = buffer[start + 1];
  const b2 = buffer[start + 2];
  const isValidHeader =
    (b1 === 0x97 || b1 === 0x98) && (b2 === 0x97 || b2 === 0x98);
  if (!isValidHeader) {
    return null;
  }

  const frameLength = buffer[start + 3] + 7;
  if (buffer.length < start + frameLength) {
    return null;
  }

  const data = buffer.slice(start, start + frameLength);
  return {
    data,
    bit: data[4],
    frameLength,
    startIndex: start,
  };
};

/** 从 buffer 中移除已解析的帧（含帧前的无效字节） */
export const consumeFrame = (buffer: number[], frame: ParsedFrame): void => {
  buffer.splice(0, frame.startIndex + frame.frameLength);
};

/** 对应电脑端 verification 中 Boot_Bin 分支 */
export const verifyBootFrame = (frame: number[]): boolean => {
  const listBin = frame.slice(0, -2);
  let sum = 0;
  listBin.forEach(item => {
    sum += item;
  });
  const expected = listBin.concat(sum & 0xff, frame[frame.length - 1]);

  if (expected.length !== frame.length) {
    return false;
  }

  for (let i = 0; i < frame.length; i++) {
    if (frame[i] !== expected[i]) {
      return false;
    }
  }
  return true;
};

/** 从文件列表响应帧中解码文件名列表 */
export const decodeFileListPayload = (frame: number[]): string => {
  return hexToString(frame.slice(5, frame.length - 2));
};

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const bytesToBase64 = (bytes: number[]): string => {
  let result = '';
  let i = 0;

  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result +=
      BASE64_CHARS[(n >> 18) & 63] +
      BASE64_CHARS[(n >> 12) & 63] +
      BASE64_CHARS[(n >> 6) & 63] +
      BASE64_CHARS[n & 63];
  }

  const remaining = bytes.length - i;
  if (remaining === 1) {
    const n = bytes[i] << 16;
    result +=
      BASE64_CHARS[(n >> 18) & 63] +
      BASE64_CHARS[(n >> 12) & 63] +
      '==';
  } else if (remaining === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    result +=
      BASE64_CHARS[(n >> 18) & 63] +
      BASE64_CHARS[(n >> 12) & 63] +
      BASE64_CHARS[(n >> 6) & 63] +
      '=';
  }

  return result;
};

export const base64ToBytes = (base64: string): number[] => {
  const normalized = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === '=') {
      break;
    }
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) {
      continue;
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return bytes;
};

export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

/** 对应电脑端 common.sumData */
export const sumData = (data: number[]): number => {
  let num = 0;
  for (let i = 0; i < data.length; i++) {
    num += data[i];
  }
  return num;
};

/** 对应电脑端 common.getInstructLIst */
export const buildInstructFrame = (
  dataLen: number,
  bit: number,
  data: number[] | number,
): number[] => {
  if (Array.isArray(data)) {
    const sum = 0x5a + 0x97 + 0x98 + dataLen + bit + sumData(data);
    return [0x5a, 0x97, 0x98, dataLen, bit, ...data, sum & 0xff, 0xa5];
  }

  const numeric = Number(data);
  const sum = 0x5a + 0x97 + 0x98 + dataLen + bit + numeric;
  return [0x5a, 0x97, 0x98, dataLen, bit, numeric, sum & 0xff, 0xa5];
};