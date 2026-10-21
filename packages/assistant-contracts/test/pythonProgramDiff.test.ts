import {
  assessAssistantPythonOmission,
  diffAssistantPython,
} from '../src/pythonProgramDiff';

describe('diffAssistantPython', () => {
  it('marks statements present only in the original program as removed', () => {
    const diff = diffAssistantPython(
      ['_motor.run_power(4, 30)', '_os.sleep_s(1)', '_motor.stop(4)'].join('\n'),
      ['_motor.run_power(4, 50)', '_os.sleep_s(1)', '_motor.stop(4)'].join('\n'),
    );
    expect(diff.removed).toEqual(['_motor.run_power(4, 30)']);
    expect(diff.added).toEqual(['_motor.run_power(4, 50)']);
  });

  it('ignores comments and loop ticks when comparing', () => {
    const diff = diffAssistantPython(
      '_motor.mov_stop()\n_os.sleep_s(0.001)\n',
      '# keep\n_motor.mov_stop()\n',
    );
    expect(diff.removed).toEqual([]);
    expect(diff.added).toEqual([]);
  });
});

describe('assessAssistantPythonOmission', () => {
  const original = [
    '_motor.run_power(4, 30)',
    '_os.sleep_s(1)',
    '_motor.stop(4)',
    "_beep.play_muic('C2', 0.25)",
  ].join('\n');

  it('blocks accepting when multiple statements disappear without clear intent', () => {
    const assessment = assessAssistantPythonOmission({
      prompt: '把矩阵灯改成显示 help',
      originalPython: original,
      candidatePython: "_matrix.show_roll(str('help'))",
    });
    expect(assessment.blockAccept).toBe(true);
    expect(assessment.removed.length).toBeGreaterThanOrEqual(2);
    expect(assessment.message).toContain('疑似漏写');
  });

  it('allows removing statements when the user asked to delete something', () => {
    const assessment = assessAssistantPythonOmission({
      prompt: '删除关闭电机',
      originalPython: original,
      candidatePython: [
        '_motor.run_power(4, 30)',
        '_os.sleep_s(1)',
        "_beep.play_muic('C2', 0.25)",
      ].join('\n'),
    });
    expect(assessment.blockAccept).toBe(false);
    expect(assessment.removed).toContain('_motor.stop(4)');
  });

  it('allows a single-statement rewrite', () => {
    const assessment = assessAssistantPythonOmission({
      prompt: '功率改成 50',
      originalPython: original,
      candidatePython: [
        '_motor.run_power(4, 50)',
        '_os.sleep_s(1)',
        '_motor.stop(4)',
        "_beep.play_muic('C2', 0.25)",
      ].join('\n'),
    });
    expect(assessment.blockAccept).toBe(false);
    expect(assessment.removed).toEqual(['_motor.run_power(4, 30)']);
  });

  it('allows changing every power value without treating it as omission', () => {
    const manyMotors = [
      '_motor.run_power(4, 30)',
      '_motor.run_power(5, 40)',
      '_motor.mov_dir_power("advance", 50)',
      '_os.sleep_s(1)',
    ].join('\n');
    const assessment = assessAssistantPythonOmission({
      prompt: '全部功率改成 60',
      originalPython: manyMotors,
      candidatePython: [
        '_motor.run_power(4, 60)',
        '_motor.run_power(5, 60)',
        '_motor.mov_dir_power("advance", 60)',
        '_os.sleep_s(1)',
      ].join('\n'),
    });
    expect(assessment.blockAccept).toBe(false);
    expect(assessment.removed.length).toBe(3);
    expect(assessment.added.length).toBe(3);
  });

  it('allows clearing when the user asked to clear', () => {
    const assessment = assessAssistantPythonOmission({
      prompt: '清空工作区',
      originalPython: original,
      candidatePython: '',
    });
    expect(assessment.blockAccept).toBe(false);
  });

  it('blocks an empty candidate when the user did not ask to clear', () => {
    const assessment = assessAssistantPythonOmission({
      prompt: '功率改成 20',
      originalPython: original,
      candidatePython: '',
    });
    expect(assessment.blockAccept).toBe(true);
    expect(assessment.message).toContain('空的');
  });
});
