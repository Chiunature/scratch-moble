import {
  ASSISTANT_PYTHON_EVALUATION_CASES,
  AssistantContractError,
  parseAssistantCodeResponse,
} from '../src';

describe('assistant python response', () => {
  it('parses a code response and strips python whitespace', () => {
    const response = parseAssistantCodeResponse({
      type: 'code',
      message: '前进后停车',
      python: '\n_motor.mov_stop()\n',
      assumptions: ['功率默认 40'],
      questions: [],
      hardware_config: { left_motor: 'E', right_motor: null },
    });
    expect(response.python).toBe('_motor.mov_stop()');
    expect(response.hardware_config.right_motor).toBeUndefined();
    expect(ASSISTANT_PYTHON_EVALUATION_CASES.map(item => item.id)).toEqual([
      'python-motor',
      'python-loop-touch',
      'python-variable',
      'python-gray-matrix',
      'python-missing-power',
    ]);
  });

  it('accepts an empty program as a request to clear the workspace', () => {
    expect(
      parseAssistantCodeResponse({
        type: 'code',
        message: '已清空工作区',
        python: '   ',
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
});
