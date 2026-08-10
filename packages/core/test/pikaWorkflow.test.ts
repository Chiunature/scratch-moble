import {
  createPikaWorkflowStateMachine,
  type PikaWorkflowPhase,
} from '../src';

describe('PikaWorkflowStateMachine', () => {
  it('沿合法链 idle → compiling → uploading → idle 推进并通知', () => {
    const machine = createPikaWorkflowStateMachine();
    const seen: PikaWorkflowPhase[] = [];
    machine.onPhaseChange(phase => seen.push(phase));

    expect(machine.transition('compiling')).toBe(true);
    expect(machine.transition('uploading')).toBe(true);
    expect(machine.transition('idle')).toBe(true);

    expect(seen).toEqual(['compiling', 'uploading', 'idle']);
    expect(machine.getPhase()).toBe('idle');
  });

  it('支持 idle → running → idle（暂停主机等瞬时动作）', () => {
    const machine = createPikaWorkflowStateMachine();

    expect(machine.transition('running')).toBe(true);
    expect(machine.getPhase()).toBe('running');
    expect(machine.transition('idle')).toBe(true);
  });

  it('非法转换被忽略且不通知', () => {
    const machine = createPikaWorkflowStateMachine();
    const seen: PikaWorkflowPhase[] = [];
    machine.onPhaseChange(phase => seen.push(phase));

    expect(machine.transition('uploading')).toBe(false);
    expect(machine.getPhase()).toBe('idle');

    machine.transition('compiling');
    expect(machine.transition('running')).toBe(false);
    expect(machine.getPhase()).toBe('compiling');

    expect(seen).toEqual(['compiling']);
  });

  it('同态转换不通知', () => {
    const machine = createPikaWorkflowStateMachine();
    const listener = jest.fn();
    machine.onPhaseChange(listener);

    expect(machine.transition('idle')).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('退订后不再收到通知', () => {
    const machine = createPikaWorkflowStateMachine();
    const listener = jest.fn();
    const unsubscribe = machine.onPhaseChange(listener);

    unsubscribe();
    machine.transition('compiling');

    expect(listener).not.toHaveBeenCalled();
  });
});