import {
  COMMANDS,
  DEVICE_ID_KEYS,
  DEVICE_ID_MAP,
  FUNCTION_CODES,
} from '../src/constants';
import { calculateChecksum, verifyBootFrame } from '../src/frames';

describe('COMMANDS 预编译帧', () => {
  const entries = Object.entries(COMMANDS);

  it('每个指令帧结构合法：5A 97 98 + len(1) + cmd + 校验和 + A5', () => {
    for (const [, frame] of entries) {
      expect(frame.length).toBe(8);
      expect(frame[0]).toBe(0x5a);
      expect(frame[1]).toBe(0x97);
      expect(frame[2]).toBe(0x98);
      expect(frame[3]).toBe(1);
      expect(frame[7]).toBe(0xa5);
    }
  });

  it('每个指令帧校验和字节正确（防预编译帧漂移）', () => {
    for (const [, frame] of entries) {
      const body = frame.slice(0, -2);
      const expected = [...body, calculateChecksum(body), 0xa5];
      expect(frame).toEqual(expected);
      expect(verifyBootFrame(frame)).toBe(true);
    }
  });
});

describe('FUNCTION_CODES', () => {
  it('上传协议功能码对齐 EST-link', () => {
    expect(FUNCTION_CODES.FILE_NAME).toBe(0xda);
    expect(FUNCTION_CODES.FILE_DATA).toBe(0xaa);
    expect(FUNCTION_CODES.LAST_DATA).toBe(0xbb);
    expect(FUNCTION_CODES.LAST_DATA_RUN).toBe(0xbc);
    expect(FUNCTION_CODES.DELETE).toBe(0xe8);
    expect(FUNCTION_CODES.FILE_LIST_RESPONSE).toBe(0x7f);
  });
});

describe('DEVICE_ID_MAP', () => {
  it('键值对与主机 deviceIdMap 对齐', () => {
    expect(DEVICE_ID_MAP['0']).toBe('noDevice');
    expect(DEVICE_ID_MAP.a1).toBe('motor');
    expect(DEVICE_ID_MAP.a2).toBe('color');
    expect(DEVICE_ID_MAP.a5).toBe('big_motor');
    expect(DEVICE_ID_MAP.a7).toBe('gray');
    expect(DEVICE_ID_MAP.dev_null).toBe('deviceAbnormal');
  });

  it('DEVICE_ID_KEYS 与键集合一致', () => {
    expect(DEVICE_ID_KEYS).toEqual(Object.keys(DEVICE_ID_MAP));
  });
});