import type { ControlState } from '../type';

/**
 * 根据完整遥控状态生成 BLE 指令帧。
 * 协议未定时先打 log，返回 null（不下发）。
 */
export function createRemoteControlCommand(
  state: ControlState,
): number[] | null {
  console.log('[remoteControl] command', {
    direction: state.direction,
    pressedButtons: [...state.pressedButtons],
    pressedShoulders: [...state.pressedShoulders],
  });
  return null;
}
