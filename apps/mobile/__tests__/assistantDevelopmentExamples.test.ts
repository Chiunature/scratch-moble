import { parseAssistantCodeResponse } from '@scratch-mobile/assistant-contracts';
import { createDevelopmentCode } from '../src/features/assistant/developmentExamples';

it('returns deterministic python for the linear examples', () => {
  const motor = createDevelopmentCode('motor');
  expect(motor.python).toContain('_motor.run_power(4, 30)');
  expect(motor.python).toContain('_motor.stop(4)');
  expect(createDevelopmentCode('all-blocks').python.split('\n')).toHaveLength(
    11,
  );
  expect(parseAssistantCodeResponse(motor)).toEqual(motor);
});

it('covers loops, variables, sensors and matrix lights', () => {
  expect(createDevelopmentCode('loop-var').python).toContain('while not');
  expect(createDevelopmentCode('sensor-matrix').python).toContain('_matrix.show');
  expect(createDevelopmentCode('sensor-matrix').python).toContain('_matrix.clear');
  expect(createDevelopmentCode('custom-block').python).toContain(
    '# @custom qianjin => 前进 %n %b',
  );
  expect(createDevelopmentCode('custom-block').python).toContain(
    'def qianjin(bushu, kaiguan):',
  );
  expect(createDevelopmentCode('custom-block').python).toContain(
    'qianjin(40, not _touch.state(0))',
  );
});
