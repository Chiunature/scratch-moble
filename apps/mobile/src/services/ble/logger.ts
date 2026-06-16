const TAG = '[BLE]';

function formatBytesHex(bytes: number[], maxLength = 64): string {
  const slice = bytes.slice(0, maxLength);
  const hex = slice.map(b => b.toString(16).padStart(2, '0')).join(' ');
  if (bytes.length > maxLength) {
    return `${hex} ... (+${bytes.length - maxLength} bytes)`;
  }
  return hex;
}

export const bleLog = {
  info: (...args: unknown[]) => console.log(TAG, ...args),
  warn: (...args: unknown[]) => console.warn(TAG, ...args),
  error: (...args: unknown[]) => console.error(TAG, ...args),
  debug: (...args: unknown[]) => console.debug(TAG, ...args),
  tx: (label: string, frame: number[]) =>
    console.log(TAG, `[TX] ${label}`, formatBytesHex(frame)),
  rx: (label: string, payload: unknown) =>
    console.log(TAG, `[RX] ${label}`, payload),
  formatBytesHex,
};

export function isBleDisconnectError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /disconnected/i.test(message);
}
