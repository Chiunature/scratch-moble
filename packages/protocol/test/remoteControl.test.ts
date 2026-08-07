import {
  buildCommand,
  buildInstructFrame,
  stringToHex,
  verifyBootFrame,
} from '../src/frames';
import {
  buildMatrixCommand,
  buildMotorCommand,
} from '../src/remoteControl';

describe('buildMotorCommand', () => {
  it('speed → 功能码 0xb0，数据为 port/speed', () => {
    const frame = buildMotorCommand({ type: 'speed', obj: { port: 4, speed: 80 } });
    expect(frame).not.toBeNull();
    expect(frame![3]).toBe(stringToHex('4/80').length);
    expect(frame![4]).toBe(0xb0);
    expect(frame!.slice(5, 5 + 4)).toEqual(stringToHex('4/80'));
    expect(verifyBootFrame(frame!)).toBe(true);
  });

  it('spin → 功能码 0xb2', () => {
    const frame = buildMotorCommand({ type: 'spin', obj: { port: 4, spin: 50 } });
    expect(frame![4]).toBe(0xb2);
  });

  it('spinCirle 默认 → 0xb1，angle → 0xb3', () => {
    const circle = buildMotorCommand({
      type: 'spinCirle',
      obj: { port: 4, spin: 90, value: 2 },
    });
    expect(circle![4]).toBe(0xb1);

    const angle = buildMotorCommand({
      type: 'spinCirle',
      obj: { port: 4, spin: 90, value: 2, type: 'angle' },
    });
    expect(angle![4]).toBe(0xb3);
  });
});

describe('buildMatrixCommand', () => {
  it('change → 0xe0，固定 9 字节矩阵', () => {
    const frame = buildMatrixCommand({
      type: 'change',
      obj: { matrix: [0, 1, 0, 1, 0, 1, 0, 1, 0] },
    });
    expect(frame![4]).toBe(0xe0);
    expect(frame![3]).toBe(0x09);
    expect(frame!.length).toBe(3 + 1 + 1 + 9 + 2);
    expect(verifyBootFrame(frame!)).toBe(true);
  });

  it('color → 0xe2，前置 0x00 后长度 5', () => {
    const frame = buildMatrixCommand({
      type: 'color',
      obj: { matrix: [1, 2, 3, 4] },
    });
    expect(frame![4]).toBe(0xe2);
    expect(frame![3]).toBe(0x04);
    expect(frame![5]).toBe(0x00);
  });

  it('brightness → 0xe1，单字节亮度', () => {
    const frame = buildMatrixCommand({
      type: 'brightness',
      obj: { matrix: 7 },
    });
    expect(frame![4]).toBe(0xe1);
    expect(frame![3]).toBe(0x01);
    expect(frame![5]).toBe(7);
  });

  it('矩阵为空的 change 返回空数据帧而非 null', () => {
    const frame = buildMatrixCommand({ type: 'change', obj: { matrix: [] } });
    expect(frame).not.toBeNull();
  });
});

describe('帧与参考实现一致性', () => {
  it('buildInstructFrame(数组) 与 buildCommand 结构等价', () => {
    const data = stringToHex('4/80');
    expect(buildInstructFrame(data.length, 0xb0, data)).toEqual(
      buildCommand(data, 0xb0),
    );
  });
});