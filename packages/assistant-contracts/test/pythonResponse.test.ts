import {
  ASSISTANT_PYTHON_EVALUATION_CASES,
  AssistantContractError,
  parseAssistantCodeResponse,
} from '../src';

const reviseEdit = {
  mode: 'revise' as const,
  scope: 'main' as const,
  allow: ['replace' as const],
  add: [] as string[],
  targets: [] as string[],
  keep: [] as string[],
  replacements: [
    { from: '_motor.mov_stop()', to: '_motor.mov_stop()' },
  ],
};

describe('assistant python response', () => {
  it('parses a code response and strips python whitespace', () => {
    const response = parseAssistantCodeResponse({
      type: 'code',
      message: '前进后停车',
      python: '\n_motor.mov_stop()\n',
      program_edit: reviseEdit,
      assumptions: ['功率默认 40'],
      questions: [],
      hardware_config: { left_motor: 'E', right_motor: null },
    });
    expect(response.python).toBe('_motor.mov_stop()');
    expect(response.programEdit?.mode).toBe('revise');
    expect(response.hardware_config.right_motor).toBeUndefined();
    expect(ASSISTANT_PYTHON_EVALUATION_CASES.map(item => item.id)).toEqual([
      'python-motor',
      'python-loop-touch',
      'python-variable',
      'python-gray-matrix',
      'python-missing-power',
    ]);
  });

  it('requires program_edit on code responses', () => {
    expect(() =>
      parseAssistantCodeResponse({
        type: 'code',
        message: '停车',
        python: '_motor.mov_stop()',
        assumptions: [],
        questions: [],
        hardware_config: {},
      }),
    ).toThrow(AssistantContractError);
  });

  it('accepts an empty program as a clear workspace request', () => {
    expect(
      parseAssistantCodeResponse({
        type: 'code',
        message: '已清空工作区',
        python: '   ',
        program_edit: {
          mode: 'clear',
          scope: 'workspace',
          allow: ['remove'],
          add: [],
          targets: [],
          keep: [],
          replacements: [],
        },
        assumptions: [],
        questions: [],
        hardware_config: {},
      }).python,
    ).toBe('');
  });

  it('rejects questions without questions', () => {
    expect(() =>
      parseAssistantCodeResponse({
        type: 'question',
        message: '请问功率？',
        python: '',
        assumptions: [],
        questions: [],
        hardware_config: {},
      }),
    ).toThrow(AssistantContractError);
  });

  it('rejects readonly responses that include python', () => {
    expect(() =>
      parseAssistantCodeResponse({
        type: 'explanation',
        message: '说明',
        python: '_motor.mov_stop()',
        assumptions: [],
        questions: [],
        hardware_config: {},
      }),
    ).toThrow(AssistantContractError);
  });
});
