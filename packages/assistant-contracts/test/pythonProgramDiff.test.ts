import {
  assessAssistantProgramEdit,
  diffAssistantPython,
  isProgramEditWidened,
  type AssistantProgramEdit,
} from '../src/pythonProgramDiff';
import { normalizePythonStatementKey } from '../src/pythonNormalize';

describe('normalizePythonStatementKey', () => {
  it('treats precedence-changing parentheses as different', () => {
    expect(normalizePythonStatementKey('x = (1 + 2) * 3')).not.toBe(
      normalizePythonStatementKey('x = 1 + 2 * 3'),
    );
  });

  it('preserves spaces inside strings', () => {
    expect(normalizePythonStatementKey('s = "A B"')).not.toBe(
      normalizePythonStatementKey('s = "AB"'),
    );
  });

  it('preserves # inside strings', () => {
    expect(normalizePythonStatementKey('_beep.play_muic("A#1", 0.25)')).not.toBe(
      normalizePythonStatementKey('_beep.play_muic("A#2", 0.25)'),
    );
  });

  it('strips redundant grouping parentheses around atoms', () => {
    expect(normalizePythonStatementKey('not (_touch.state(0))')).toBe(
      normalizePythonStatementKey('not _touch.state(0)'),
    );
  });

  it('strips not-grouping parens inside call arguments', () => {
    expect(
      normalizePythonStatementKey('qianjin(40, not (_touch.state(0)))'),
    ).toBe(normalizePythonStatementKey('qianjin(40, not _touch.state(0))'));
  });
});

describe('diffAssistantPython', () => {
  it('marks statements present only in the original program as removed', () => {
    const diff = diffAssistantPython(
      ['_motor.run_power(4, 30)', '_os.sleep_s(1)', '_motor.stop(4)'].join('\n'),
      ['_motor.run_power(4, 50)', '_os.sleep_s(1)', '_motor.stop(4)'].join('\n'),
    );
    expect(diff.removed).toEqual([
      normalizePythonStatementKey('_motor.run_power(4, 30)'),
    ]);
    expect(diff.added).toEqual([
      normalizePythonStatementKey('_motor.run_power(4, 50)'),
    ]);
  });

  it('ignores loop ticks when comparing but keeps metadata comments', () => {
    const diff = diffAssistantPython(
      '_motor.mov_stop()\n_os.sleep_s(0.001)\n',
      '# keep\n_motor.mov_stop()\n',
    );
    expect(diff.removed).toEqual([]);
    expect(diff.added).toEqual([]);

    const meta = diffAssistantPython(
      '# @var speed => 速度\nspeed = 40',
      '# @var pace => 速度\nspeed = 40',
    );
    expect(meta.removed.length).toBe(1);
    expect(meta.added.length).toBe(1);
  });
});

describe('assessAssistantProgramEdit', () => {
  const original = [
    '_motor.run_power(4, 30)',
    '_os.sleep_s(1)',
    '_motor.stop(4)',
  ].join('\n');

  const revisePower: AssistantProgramEdit = {
    mode: 'revise',
    scope: 'main',
    allow: ['replace'],
    add: [],
    targets: [],
    keep: [],
    replacements: [
      { from: '_motor.run_power(4, 30)', to: '_motor.run_power(4, 50)' },
    ],
  };

  it('allows a declared parameter replacement under revise', () => {
    const assessment = assessAssistantProgramEdit({
      programEdit: revisePower,
      originalPython: original,
      candidatePython: [
        '_motor.run_power(4, 50)',
        '_os.sleep_s(1)',
        '_motor.stop(4)',
      ].join('\n'),
    });
    expect(assessment.blockAccept).toBe(false);
  });

  it('rejects unrelated delete offset by an add under revise', () => {
    const assessment = assessAssistantProgramEdit({
      programEdit: {
        mode: 'revise',
        scope: 'main',
        allow: ['add', 'replace'],
        add: ['_os.sleep_s(2)'],
        targets: [],
        keep: [],
        replacements: [],
      },
      originalPython: ['_motor.run_power(4, 30)', '_motor.stop(4)'].join('\n'),
      candidatePython: ['_motor.run_power(4, 30)', '_os.sleep_s(2)'].join('\n'),
    });
    expect(assessment.blockAccept).toBe(true);
    expect(assessment.message).toContain('未声明的删除');
  });

  it('allows delete only for declared targets', () => {
    const assessment = assessAssistantProgramEdit({
      programEdit: {
        mode: 'delete',
        scope: 'main',
        allow: ['remove'],
        add: [],
        targets: ['_motor.stop(4)'],
        keep: [],
        replacements: [],
      },
      originalPython: original,
      candidatePython: ['_motor.run_power(4, 30)', '_os.sleep_s(1)'].join('\n'),
    });
    expect(assessment.blockAccept).toBe(false);
  });

  it('keeps keep-only distinct from clear', () => {
    const keepOnly = assessAssistantProgramEdit({
      programEdit: {
        mode: 'keep-only',
        scope: 'main',
        allow: ['remove'],
        add: [],
        targets: [],
        keep: ['_motor.run_power(4, 30)'],
        replacements: [],
      },
      originalPython: original,
      candidatePython: '_motor.run_power(4, 30)',
    });
    expect(keepOnly.blockAccept).toBe(false);

    const clearMain = assessAssistantProgramEdit({
      programEdit: {
        mode: 'clear',
        scope: 'main',
        allow: ['remove'],
        add: [],
        targets: [],
        keep: [],
        replacements: [],
      },
      originalPython: original,
      candidatePython: '',
    });
    expect(clearMain.blockAccept).toBe(false);

    const clearWorkspace = assessAssistantProgramEdit({
      programEdit: {
        mode: 'clear',
        scope: 'workspace',
        allow: ['remove'],
        add: [],
        targets: [],
        keep: [],
        replacements: [],
      },
      originalPython: original,
      candidatePython: '',
    });
    expect(clearWorkspace.blockAccept).toBe(false);
  });

  it('rejects workspace scope unless mode is clear', () => {
    const assessment = assessAssistantProgramEdit({
      programEdit: {
        mode: 'revise',
        scope: 'workspace',
        allow: ['add'],
        add: ['_motor.mov_stop()'],
        targets: [],
        keep: [],
        replacements: [],
      },
      originalPython: '',
      candidatePython: '_motor.mov_stop()',
    });
    expect(assessment.blockAccept).toBe(true);
    expect(assessment.message).toContain('workspace');
  });
});

describe('isProgramEditWidened', () => {
  const locked: AssistantProgramEdit = {
    mode: 'revise',
    scope: 'main',
    allow: ['replace'],
    add: [],
    targets: [],
    keep: [],
    replacements: [{ from: 'a = 1', to: 'a = 2' }],
  };

  it('detects a wider mode or allow list', () => {
    expect(
      isProgramEditWidened(locked, {
        ...locked,
        mode: 'delete',
        allow: ['remove'],
      }),
    ).toBe(true);
    expect(
      isProgramEditWidened(locked, {
        ...locked,
        allow: ['replace', 'add'],
      }),
    ).toBe(true);
    expect(isProgramEditWidened(locked, locked)).toBe(false);
  });
});
