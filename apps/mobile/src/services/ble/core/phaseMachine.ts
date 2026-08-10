/**
 * BLE 连接显式状态机（纯 TS，无 RN 依赖，可单测）。
 * manager 是唯一事实源；store 通过 onPhaseChange 做投影，UI 不再直接写状态。
 *
 * 状态：idle / scanning / connecting / connected / uploading / disconnected。
 * 扫描与连接互斥（已连接不可扫描）；uploading 是 connected 的子阶段（链路未断）。
 */
import { bleLog } from './logger';

export type BleConnectionPhase =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'uploading'
  | 'disconnected';

/**
 * 合法转换表；非法转换记警告并忽略（防御异步竞态回卷）。
 * 扫描与连接可并存（切换设备场景：已连接时可继续扫描找新目标）；
 * connected 与 scanning 可互转，扫描中被动断开也能收敛回 disconnected。
 */
const ALLOWED_TRANSITIONS: Record<
  BleConnectionPhase,
  ReadonlySet<BleConnectionPhase>
> = {
  idle: new Set(['scanning', 'connecting', 'disconnected']),
  scanning: new Set(['idle', 'connected', 'connecting', 'disconnected']),
  connecting: new Set(['connected', 'disconnected']),
  connected: new Set(['disconnected', 'uploading', 'scanning']),
  uploading: new Set(['connected', 'disconnected']),
  disconnected: new Set(['scanning', 'connecting']),
};

export class ConnectionPhaseMachine {
  private phase: BleConnectionPhase = 'idle';
  private readonly listeners = new Set<(phase: BleConnectionPhase) => void>();

  getPhase(): BleConnectionPhase {
    return this.phase;
  }

  /** 订阅相位变化；返回退订函数 */
  onPhaseChange(listener: (phase: BleConnectionPhase) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  transition(next: BleConnectionPhase): void {
    if (next === this.phase) {
      return;
    }
    if (!ALLOWED_TRANSITIONS[this.phase].has(next)) {
      bleLog.warn('非法 BLE 状态转换已忽略', { from: this.phase, to: next });
      return;
    }
    this.phase = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }
}