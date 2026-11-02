import { firstPythonMismatchMessage } from '../src/assistant/pythonMismatch';

describe('firstPythonMismatchMessage', () => {
  it('reports only the first mismatched Python line without full program dumps', () => {
    const message = firstPythonMismatchMessage(
      ['_motor.run_power(4, 30)', '_motor.stop(4)', '_os.sleep_s(1)'].join('\n'),
      ['_motor.run_power(4, 30)', '_motor.stop(5)', '_os.sleep_s(1)'].join('\n'),
    );
    expect(message).toContain('原程序第 2 行：_motor.stop(4)');
    expect(message).toContain('生成结果第 2 行：_motor.stop(5)');
    expect(message).not.toContain('_os.sleep_s(1)');
    expect(message).not.toContain('原程序：\n');
  });
});
