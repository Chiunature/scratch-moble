import {
  pikaWorkflow,
  useRuntimeStore,
} from '../src/store/useRuntimeStore';

test('useRuntimeStore 投影 pika 工作流相位', () => {
  expect(useRuntimeStore.getState().workflowPhase).toBe('idle');

  pikaWorkflow.transition('compiling');

  expect(useRuntimeStore.getState().workflowPhase).toBe('compiling');

  pikaWorkflow.transition('idle');
});