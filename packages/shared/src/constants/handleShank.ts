export const HANDLE_SHANK_KEYS = [
  'up',
  'down',
  'left',
  'right',
  'L1',
  'R1',
  'y',
  'a',
  'b',
  'x',
] as const;

export type HandleShankKey = (typeof HANDLE_SHANK_KEYS)[number];

export const DEFAULT_HANDLE_SHANK_KEY: HandleShankKey = 'up';

export const HANDLE_SHANK_KEY_LABELS: Record<HandleShankKey, string> = {
  up: '方向上',
  down: '方向下',
  left: '方向左',
  right: '方向右',
  L1: '左肩键 L1',
  R1: '右肩键 R1',
  y: 'Y 键',
  a: 'A 键',
  b: 'B 键',
  x: 'X 键',
};

export function isHandleShankKey(value: string): value is HandleShankKey {
  return (HANDLE_SHANK_KEYS as readonly string[]).includes(value);
}

export function normalizeHandleShankKey(value: string | null | undefined): HandleShankKey {
  return value && isHandleShankKey(value) ? value : DEFAULT_HANDLE_SHANK_KEY;
}
