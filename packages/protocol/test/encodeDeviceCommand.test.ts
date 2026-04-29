import { encodeDeviceCommand } from '../src';

test('encodes a device command', () => {
  expect(encodeDeviceCommand({ command: 'ping' })).toBe('{"command":"ping"}');
});
