import { create } from 'zustand';

import {
  createPikaWorkflowStateMachine,
  type PikaWorkflowPhase,
} from '@scratch-mobile/core';

/**
 * 全局 pika 工作流状态机（唯一事实源，见 packages/core/runtime/pikaWorkflow）。
 * 本 store 是其投影：唯一写入方是下方的 onPhaseChange 订阅，UI 不得直接改状态。
 */
export const pikaWorkflow = createPikaWorkflowStateMachine();

type RuntimeStore = {
  workflowPhase: PikaWorkflowPhase;
};

export const useRuntimeStore = create<RuntimeStore>(() => ({
  workflowPhase: pikaWorkflow.getPhase(),
}));

pikaWorkflow.onPhaseChange(phase => {
  useRuntimeStore.setState({ workflowPhase: phase });
});