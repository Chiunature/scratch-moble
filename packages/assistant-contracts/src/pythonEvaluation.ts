export type AssistantPythonEvaluationCase = {
  id: string;
  prompt: string;
  expectedType: 'code' | 'question';
  /** 反编译后应出现的积木 type；提问用例为空。 */
  expectedBlockTypes: readonly string[];
};

export const ASSISTANT_PYTHON_EVALUATION_CASES: readonly AssistantPythonEvaluationCase[] =
  [
    {
      id: 'python-motor',
      prompt: '让 E 口电机以 50% 功率运行。',
      expectedType: 'code',
      expectedBlockTypes: ['run_power'],
    },
    {
      id: 'python-loop-touch',
      prompt: '直到 A 口触碰传感器被按下前，小车以 40% 功率前进，然后停车。',
      expectedType: 'code',
      expectedBlockTypes: ['control_while_do', 'mov_dir_power', 'mov_stop'],
    },
    {
      id: 'python-variable',
      prompt: '把速度设为 60，再让 E 口电机按这个速度运行。',
      expectedType: 'code',
      expectedBlockTypes: ['data_setvariableto', 'run_power'],
    },
    {
      id: 'python-gray-matrix',
      prompt: '如果 A 口灰度大于 50，就点亮全部矩阵灯，否则清空矩阵灯。',
      expectedType: 'code',
      expectedBlockTypes: ['control_if_else', 'show', 'clear'],
    },
    {
      id: 'python-missing-power',
      prompt: '让小车前进一会儿。',
      expectedType: 'question',
      expectedBlockTypes: [],
    },
  ];
