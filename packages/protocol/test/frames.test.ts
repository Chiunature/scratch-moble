import {
  base64ToBytes,
  buildCommand,
  buildInstructFrame,
  buildUploadFrames,
  bytesToBase64,
  calculateChecksum,
  catchData,
  checkBinData,
  checkFileName,
  consumeFrame,
  decodeFileListPayload,
  stringToHex,
  uploadSlice,
  verifyBootFrame,
} from '../src/frames';

describe('calculateChecksum', () => {
  it('对字节求和取低 8 位', () => {
    expect(calculateChecksum([0x5a, 0x97, 0x98, 0x01, 0xea])).toBe(0x74);
    expect(calculateChecksum([0xff, 0x01])).toBe(0x00);
  });
});

describe('buildCommand', () => {
  it('组装 5A 97 98 len cmd data checksum A5 帧', () => {
    const frame = buildCommand([0x01, 0x02], 0xea);
    expect(frame.length).toBe(9);
    expect(frame[0]).toBe(0x5a);
    expect(frame[1]).toBe(0x97);
    expect(frame[2]).toBe(0x98);
    expect(frame[3]).toBe(2);
    expect(frame[4]).toBe(0xea);
    expect(frame[5]).toBe(0x01);
    expect(frame[6]).toBe(0x02);
    expect(frame[7]).toBe((0x5a + 0x97 + 0x98 + 2 + 0xea + 0x01 + 0x02) & 0xff);
    expect(frame[8]).toBe(0xa5);
  });
});

describe('checkFileName / checkBinData', () => {
  it('文件名帧：头 + len + 功能码 + 文件名 + 校验和 + A5', () => {
    const frame = checkFileName('0.o', 0xda);
    expect(frame.slice(0, 3)).toEqual([0x5a, 0x97, 0x98]);
    expect(frame[3]).toBe(3);
    expect(frame[4]).toBe(0xda);
    expect(frame.slice(5, 8)).toEqual([0x30, 0x2e, 0x6f]);
    expect(frame[frame.length - 1]).toBe(0xa5);
    expect(verifyBootFrame(frame)).toBe(true);
  });

  it('数据帧功能码：中间 0xaa / 末包 0xbb / 上传后运行 0xbc', () => {
    const chunk = [1, 2, 3];
    expect(checkBinData(chunk, false)[4]).toBe(0xaa);
    expect(checkBinData(chunk, true)[4]).toBe(0xbb);
    expect(checkBinData(chunk, true, true)[4]).toBe(0xbc);
  });
});

describe('uploadSlice / buildUploadFrames', () => {
  it('数据小于等于分包大小时只有一片', () => {
    expect(uploadSlice([1, 2, 3], 128)).toEqual([[1, 2, 3]]);
  });

  it('按分包大小切分', () => {
    const slices = uploadSlice([1, 2, 3, 4, 5], 2);
    expect(slices).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('上传帧序列 = 文件名帧 + 数据帧，末包带 runAfterUpload 标记', () => {
    const frames = buildUploadFrames('0.o', [1, 2, 3, 4, 5], 0xda, 2, true);
    expect(frames.length).toBe(4);
    expect(frames[0][4]).toBe(0xda);
    expect(frames[1][4]).toBe(0xaa);
    expect(frames[2][4]).toBe(0xaa);
    expect(frames[3][4]).toBe(0xbc);
    frames.forEach(frame => {
      expect(verifyBootFrame(frame)).toBe(true);
    });
  });
});

describe('catchData / consumeFrame', () => {
  const frame = buildCommand([0x01], 0xea);

  it('完整帧可解析出 bit / frameLength / startIndex', () => {
    const parsed = catchData([...frame]);
    expect(parsed).not.toBeNull();
    expect(parsed!.bit).toBe(0xea);
    expect(parsed!.frameLength).toBe(frame.length);
    expect(parsed!.startIndex).toBe(0);
    expect(parsed!.data).toEqual(frame);
  });

  it('残缺帧返回 null 且不消费 buffer', () => {
    const partial = frame.slice(0, -2);
    expect(catchData(partial)).toBeNull();
  });

  it('跳过帧前脏字节并记录 startIndex', () => {
    const buffer = [0x00, 0xff, ...frame];
    const parsed = catchData(buffer);
    expect(parsed).not.toBeNull();
    expect(parsed!.startIndex).toBe(2);
  });

  it('consumeFrame 移除帧与帧前无效字节', () => {
    const buffer = [0x99, ...frame, 0x01];
    const parsed = catchData(buffer)!;
    consumeFrame(buffer, parsed);
    expect(buffer).toEqual([0x01]);
  });
});

describe('base64', () => {
  it('bytesToBase64 / base64ToBytes 往返一致（覆盖 0/1/2 余数）', () => {
    const cases: number[][] = [[], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4]];
    for (const bytes of cases) {
      expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    }
  });

  it('base64ToBytes 容忍非 base64 字符', () => {
    expect(base64ToBytes('aGVsbG8=')).toEqual(stringToHex('hello'));
  });
});

describe('decodeFileListPayload', () => {
  it('从文件列表响应帧解码文件名', () => {
    const frame = checkFileName('0.o,1.o', 0x7f);
    expect(decodeFileListPayload(frame)).toBe('0.o,1.o');
  });
});

describe('buildInstructFrame', () => {
  it('数组数据形式', () => {
    const frame = buildInstructFrame(2, 0xb0, [0x30, 0x31]);
    expect(frame[3]).toBe(2);
    expect(frame[4]).toBe(0xb0);
    expect(verifyBootFrame(frame)).toBe(true);
  });

  it('单值数据形式', () => {
    const frame = buildInstructFrame(1, 0xe1, 5);
    expect(frame[3]).toBe(1);
    expect(frame[4]).toBe(0xe1);
    expect(frame[5]).toBe(5);
    expect(verifyBootFrame(frame)).toBe(true);
  });
});

describe('verifyBootFrame', () => {
  it('校验和正确的帧通过，篡改后失败', () => {
    const frame = buildCommand([0x01, 0x02], 0xea);
    expect(verifyBootFrame(frame)).toBe(true);

    const tampered = [...frame];
    tampered[5] = 0xff;
    expect(verifyBootFrame(tampered)).toBe(false);
  });
});