import { formatRuntimeTicks } from '../src';

test('formats runtime ticks', () => {
  expect(formatRuntimeTicks(3)).toBe('Runtime ticks: 3');
});
