import { useRuntimeStore } from '../src/store/useRuntimeStore';

test('increments runtime ticks', () => {
  useRuntimeStore.getState().reset();
  useRuntimeStore.getState().increment();

  expect(useRuntimeStore.getState().ticks).toBe(1);
});
