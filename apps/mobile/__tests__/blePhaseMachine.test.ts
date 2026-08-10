import {
  ConnectionPhaseMachine,
  type BleConnectionPhase,
} from '../src/services/ble/core/phaseMachine';

describe('ConnectionPhaseMachine', () => {
  it('初始相位为 idle', () => {
    const machine = new ConnectionPhaseMachine();
    expect(machine.getPhase()).toBe('idle');
  });

  it('合法转换通知订阅者', () => {
    const machine = new ConnectionPhaseMachine();
    const seen: BleConnectionPhase[] = [];
    machine.onPhaseChange((phase) => seen.push(phase));

    machine.transition('scanning');
    machine.transition('connecting');
    machine.transition('connected');

    expect(machine.getPhase()).toBe('connected');
    expect(seen).toEqual(['scanning', 'connecting', 'connected']);
  });

  it('同相位转换是 no-op，不重复通知', () => {
    const machine = new ConnectionPhaseMachine();
    const listener = jest.fn();
    machine.onPhaseChange(listener);

    machine.transition('scanning');
    machine.transition('scanning');

    expect(machine.getPhase()).toBe('scanning');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('非法转换被忽略并记录警告（防御异步竞态回卷）', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const machine = new ConnectionPhaseMachine();
    const listener = jest.fn();

    machine.onPhaseChange(listener);
    // idle 不允许直接到 connected / uploading
    machine.transition('connected');
    machine.transition('uploading');

    expect(machine.getPhase()).toBe('idle');
    expect(listener).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('uploading 是 connected 的子阶段，可互转', () => {
    const machine = new ConnectionPhaseMachine();
    machine.transition('scanning');
    machine.transition('connecting');
    machine.transition('connected');
    machine.transition('uploading');

    expect(machine.getPhase()).toBe('uploading');

    machine.transition('connected');
    expect(machine.getPhase()).toBe('connected');
  });

  it('完整生命周期：scanning → connecting → connected → disconnected → scanning', () => {
    const machine = new ConnectionPhaseMachine();
    for (const phase of [
      'scanning',
      'connecting',
      'connected',
      'disconnected',
      'scanning',
    ] as const) {
      machine.transition(phase);
    }
    expect(machine.getPhase()).toBe('scanning');
  });

  it('退订后不再收到通知', () => {
    const machine = new ConnectionPhaseMachine();
    const listener = jest.fn();
    const unsubscribe = machine.onPhaseChange(listener);

    unsubscribe();
    machine.transition('scanning');

    expect(machine.getPhase()).toBe('scanning');
    expect(listener).not.toHaveBeenCalled();
  });

  it('多个订阅者均收到通知', () => {
    const machine = new ConnectionPhaseMachine();
    const first = jest.fn();
    const second = jest.fn();
    machine.onPhaseChange(first);
    machine.onPhaseChange(second);

    machine.transition('scanning');

    expect(first).toHaveBeenCalledWith('scanning');
    expect(second).toHaveBeenCalledWith('scanning');
  });
});