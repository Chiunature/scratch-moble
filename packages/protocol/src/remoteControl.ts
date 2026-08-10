/**
 * 遥控指令帧构建（对应电脑端 motorChange / matrixChange）。
 * 纯 TS，无 RN 依赖。
 */
import { buildInstructFrame, stringToHex } from './frames';

export type MotorControlPayload =
  | { type: 'speed'; obj: { port: number; speed: number } }
  | { type: 'spin'; obj: { port: number; spin: number } }
  | {
      type: 'spinCirle';
      obj: {
        port: number;
        spin: number;
        value: number;
        type?: 'angle';
      };
    };

export type MatrixControlPayload =
  | { type: 'change'; obj: { matrix: number[] } }
  | { type: 'color'; obj: { matrix: number[] } }
  | { type: 'brightness'; obj: { matrix: number } };

/** 对应电脑端 motorChange */
export const buildMotorCommand = (
  payload: MotorControlPayload,
): number[] | null => {
  const { type, obj: motor } = payload;

  switch (type) {
    case 'speed': {
      const data = stringToHex(`${motor.port}/${motor.speed}`);
      return buildInstructFrame(data.length, 0xb0, data);
    }
    case 'spin': {
      const data = stringToHex(`${motor.port}/${motor.spin}`);
      return buildInstructFrame(data.length, 0xb2, data);
    }
    case 'spinCirle': {
      const data = stringToHex(`${motor.port}/${motor.spin}/${motor.value}`);
      const bit = motor.type === 'angle' ? 0xb3 : 0xb1;
      return buildInstructFrame(data.length, bit, data);
    }
    default:
      return null;
  }
};

/** 对应电脑端 matrixChange */
export const buildMatrixCommand = (
  payload: MatrixControlPayload,
): number[] | null => {
  const { type, obj } = payload;

  switch (type) {
    case 'change':
      return buildInstructFrame(0x09, 0xe0, [...obj.matrix]);
    case 'color': {
      const matrix = [...obj.matrix];
      matrix.unshift(0x00);
      return buildInstructFrame(0x04, 0xe2, matrix);
    }
    case 'brightness':
      return buildInstructFrame(0x01, 0xe1, obj.matrix);
    default:
      return null;
  }
};

/**
 * 遥控手柄键值帧（电脑端手柄键值协议，固定 17 字节）：
 * `{5A 97 98 0A C1}` + 10 个按键位 + 校验 + `A5`。
 * 按键位顺序：上/下/左/右/A1/A2/B1/B2/左肩/右肩，按下 1 松开 0。
 * 校验 = data[0..14] 逐字节求和 & 0xFF。
 * 发送策略（app 侧实现）：按键变化立即发送；无变化累计 1s 续发一次。
 */
export type RemoteControlKeyState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a1: boolean;
  a2: boolean;
  b1: boolean;
  b2: boolean;
  leftShoulder: boolean;
  rightShoulder: boolean;
};

const REMOTE_CONTROL_HEADER = [0x5a, 0x97, 0x98, 0x0a, 0xc1] as const;
const REMOTE_CONTROL_TAIL = 0xa5;

export const buildRemoteControlFrame = (
  state: RemoteControlKeyState,
): number[] => {
  const buttons = [
    state.up,
    state.down,
    state.left,
    state.right,
    state.a1,
    state.a2,
    state.b1,
    state.b2,
    state.leftShoulder,
    state.rightShoulder,
  ].map(pressed => (pressed ? 1 : 0));

  const data = [...REMOTE_CONTROL_HEADER, ...buttons];
  const checksum = data.reduce<number>(
    (sum, byte) => (sum + byte) & 0xff,
    0,
  );
  return [...data, checksum, REMOTE_CONTROL_TAIL];
};