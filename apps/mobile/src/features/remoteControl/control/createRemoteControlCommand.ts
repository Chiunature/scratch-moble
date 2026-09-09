import { buildRemoteControlFrame } from '@scratch-mobile/protocol';

import type { ControlState } from '../type';

/**
 * 遥控状态 → 17 字节键值帧（协议：{5A 97 98 0A C1} + 10 按键位 + 校验 + A5）。
 * 字节构建在 @scratch-mobile/protocol；本层只做 UI 状态 → 协议键位映射：
 * 方向→上/下/左/右，A/B/X/Y→A1/A2/B1/B2，肩键 L/R→左/右肩。
 */
export function createRemoteControlCommand(state: ControlState): number[] {
  return buildRemoteControlFrame({
    up: state.direction === 'top',
    down: state.direction === 'bottom',
    left: state.direction === 'left',
    right: state.direction === 'right',
    a1: state.pressedButtons.includes('A'),
    a2: state.pressedButtons.includes('Y'),
    b1: state.pressedButtons.includes('B'),
    b2: state.pressedButtons.includes('X'),
    leftShoulder: state.pressedShoulders.includes('L'),
    rightShoulder: state.pressedShoulders.includes('R'),
  });
}
