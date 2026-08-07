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