import { useCallback, useEffect, useRef, useState } from 'react';
import { createRemoteControlCommand } from '../control/createRemoteControlCommand';
import {
  INITIAL_CONTROL_STATE,
  type ControlState,
  type JoystickDirection,
  type RemoteButton,
  type ShoulderButton,
} from '../type';

function isSameState(a: ControlState, b: ControlState): boolean {
  return (
    a.direction === b.direction &&
    a.pressedButtons.length === b.pressedButtons.length &&
    a.pressedButtons.every((btn, i) => btn === b.pressedButtons[i]) &&
    a.pressedShoulders.length === b.pressedShoulders.length &&
    a.pressedShoulders.every((btn, i) => btn === b.pressedShoulders[i])
  );
}

/** 无按键变化时的续发间隔（协议：相同键值累计 1s 再发一次，每次发送重置计时） */
const REMOTE_CONTROL_REFRESH_MS = 1000;

type UseRemoteControlControllerOptions = {
  /** 有帧时下发；未连接时可不传 */
  send?: (command: number[]) => void;
};

export function useRemoteControlController(
  options: UseRemoteControlControllerOptions = {},
) {
  const { send } = options;
  const stateRef = useRef<ControlState>(INITIAL_CONTROL_STATE);
  const [controlState, setControlState] = useState<ControlState>(
    INITIAL_CONTROL_STATE,
  );

  // 按键变化由 commit 立即发送；无变化时按协议每 1s 续发当前键值帧
  useEffect(() => {
    if (!send) {
      return;
    }
    const timer = setInterval(() => {
      send(createRemoteControlCommand(stateRef.current));
    }, REMOTE_CONTROL_REFRESH_MS);
    return () => clearInterval(timer);
  }, [send]);

  const commit = useCallback(
    (patch: Partial<ControlState>) => {
      const next: ControlState = {
        ...stateRef.current,
        ...patch,
      };
      if (isSameState(stateRef.current, next)) {
        return;
      }

      stateRef.current = next;
      setControlState(next);
      send?.(createRemoteControlCommand(next));
    },
    [send],
  );

  const setDirection = useCallback(
    (joystickDirection: JoystickDirection) => {
      commit({
        direction: joystickDirection === 'center' ? null : joystickDirection,
      });
    },
    [commit],
  );

  const pressButton = useCallback(
    (button: RemoteButton) => {
      const pressed = stateRef.current.pressedButtons;
      if (pressed.includes(button)) {
        return;
      }
      commit({ pressedButtons: [...pressed, button] });
    },
    [commit],
  );

  const releaseButton = useCallback(
    (button: RemoteButton) => {
      const pressed = stateRef.current.pressedButtons;
      if (!pressed.includes(button)) {
        return;
      }
      commit({
        pressedButtons: pressed.filter(item => item !== button),
      });
    },
    [commit],
  );

  const pressShoulder = useCallback(
    (button: ShoulderButton) => {
      const pressed = stateRef.current.pressedShoulders;
      if (pressed.includes(button)) {
        return;
      }
      commit({ pressedShoulders: [...pressed, button] });
    },
    [commit],
  );

  const releaseShoulder = useCallback(
    (button: ShoulderButton) => {
      const pressed = stateRef.current.pressedShoulders;
      if (!pressed.includes(button)) {
        return;
      }
      commit({
        pressedShoulders: pressed.filter(item => item !== button),
      });
    },
    [commit],
  );

  return {
    controlState,
    setDirection,
    pressButton,
    releaseButton,
    pressShoulder,
    releaseShoulder,
  };
}
