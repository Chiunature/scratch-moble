/**
 * PikaScript 工作流状态机（纯 TS，无 RN 依赖，可单测）。
 *
 * 覆盖「编译 → 上传 → 运行」的 UI 流程状态：
 * - idle → compiling：开始编译
 * - compiling → uploading：编译成功、开始 BLE 上传
 * - compiling → idle：编译失败 / 无有效源码
 * - uploading → idle：上传完成或失败
 * - idle → running：暂停主机等瞬时动作
 * - running → idle：动作结束
 *
 * 状态机是唯一事实源；store 通过 onPhaseChange 投影，UI 不直接写状态。
 * 非法转换返回 false 并忽略（防御异步竞态回卷）。
 */
export type PikaWorkflowPhase = 'idle' | 'compiling' | 'uploading' | 'running';

const ALLOWED_TRANSITIONS: Record<
  PikaWorkflowPhase,
  ReadonlySet<PikaWorkflowPhase>
> = {
  idle: new Set(['compiling', 'running']),
  compiling: new Set(['uploading', 'idle']),
  uploading: new Set(['idle']),
  running: new Set(['idle']),
};

export class PikaWorkflowStateMachine {
  private phase: PikaWorkflowPhase = 'idle';
  private readonly listeners = new Set<(phase: PikaWorkflowPhase) => void>();

  getPhase(): PikaWorkflowPhase {
    return this.phase;
  }

  /** 订阅相位变化；返回退订函数 */
  onPhaseChange(listener: (phase: PikaWorkflowPhase) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 尝试转换；合法返回 true，非法（含同态）返回 false 且不通知 */
  transition(next: PikaWorkflowPhase): boolean {
    if (next === this.phase) {
      return false;
    }
    if (!ALLOWED_TRANSITIONS[this.phase].has(next)) {
      return false;
    }
    this.phase = next;
    for (const listener of this.listeners) {
      listener(next);
    }
    return true;
  }
}

export function createPikaWorkflowStateMachine(): PikaWorkflowStateMachine {
  return new PikaWorkflowStateMachine();
}