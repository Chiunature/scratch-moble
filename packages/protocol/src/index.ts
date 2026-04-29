export type DeviceCommand = {
  command: 'ping' | 'stop';
  payload?: string;
};

export function encodeDeviceCommand(command: DeviceCommand) {
  return JSON.stringify(command);
}
