export type Direction = 'top' | 'bottom' | 'left' | 'right';

/** 摇杆回调：回中为 center */
export type JoystickDirection = Direction | 'center';

export type RemoteButton = 'A' | 'B' | 'X' | 'Y';

/** 肩键 L / R */
export type ShoulderButton = 'L' | 'R';

export type ControlState = {
  /** null = 摇杆回中，无方向 */
  direction: Direction | null;
  pressedButtons: RemoteButton[];
  pressedShoulders: ShoulderButton[];
};

export const INITIAL_CONTROL_STATE: ControlState = {
  direction: null,
  pressedButtons: [],
  pressedShoulders: [],
};
