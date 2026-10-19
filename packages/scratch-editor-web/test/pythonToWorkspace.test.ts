import { pitchToDisplayName } from '@scratch-mobile/shared';

import { normalizeAssistantPython, pythonToWorkspace } from '../src/decompile';
import { PythonDecompileError } from '../src/decompile/ast';

describe('pythonToWorkspace', () => {
  it('decompiles the original 11 linear statements', () => {
    const note = pitchToDisplayName(36);
    const fragment = pythonToWorkspace(
      [
        '_motor.run_power(4, 30)',
        '_motor.run_for_power_seconds(5, -20, 2)',
        '_motor.stop(6)',
        '_motor.stop_module(7, 1)',
        "_motor.mov_dir_power('advance', 40)",
        "_motor.mov_dir_power_seconds('retreat', 30, 1.5)",
        '_motor.mov_power(50, 30)',
        '_motor.mov_for_power_seconds(40, -40, 3)',
        '_motor.mov_stop()',
        '_os.sleep_s(1)',
        `_beep.play_muic('${note}', 0.25)`,
      ].join('\n'),
      'ai',
    );
    const types: string[] = [];
    let block = fragment.chain;
    while (block) {
      types.push(block.type);
      block = block.next?.block;
    }
    expect(types).toEqual([
      'run_power',
      'run_for_power_seconds',
      'stop',
      'stop_module',
      'mov_dir_power',
      'mov_dir_power_seconds',
      'mov_power',
      'mov_for_power_seconds',
      'mov_stop',
      'sleep_s',
      'play_music',
    ]);
  });

  it('decompiles loops, variables, sensors and matrix lights', () => {
    const fragment = pythonToWorkspace(
      [
        '# @var speed => 速度',
        'speed = 40',
        'while not (_touch.state(0)):',
        "    _motor.mov_dir_power('advance', speed)",
        'if _color.cmp_lux(0, \'>\', 50):',
        '    _matrix.show(0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F)',
        'else:',
        '    _matrix.clear()',
        'for count in range(3):',
        '    _os.sleep_s(0.2)',
        '_os.resetTimer()',
      ].join('\n'),
      'ai',
    );
    expect(fragment.variables).toEqual([
      expect.objectContaining({ name: '速度' }),
    ]);
    expect(fragment.chain?.type).toBe('data_setvariableto');
    expect(fragment.chain?.next?.block.type).toBe('control_while_do');
    const matrix = fragment.chain?.next?.block.next?.block;
    expect(matrix?.type).toBe('control_if_else');
    expect(matrix?.inputs?.SUBSTACK?.block?.type).toBe('show');
    expect(matrix?.inputs?.SUBSTACK2?.block?.type).toBe('clear');
    expect(matrix?.next?.block.type).toBe('control_while_times');
    expect(matrix?.next?.block.next?.block.type).toBe('resetTimer');
  });

  it('treats quote style and Chinese variable display names as the same program', () => {
    expect(normalizeAssistantPython("_motor.mov_dir_power('advance', 40)")).toBe(
      normalizeAssistantPython('_motor.mov_dir_power("advance", 40)'),
    );
    expect(
      normalizeAssistantPython('# @var speed => 速度\nspeed = 40'),
    ).toBe(normalizeAssistantPython('sudu = 40'));
  });

  it('normalizes editor-inserted globals and loop ticks', () => {
    expect(
      normalizeAssistantPython(`speed = 0

global speed
while True:
    _motor.mov_stop()
    _os.sleep_s(0.001)
`),
    ).toBe(normalizeAssistantPython(`while True:\n    _motor.mov_stop()`));
  });

  it('rejects unsupported calls with a line number', () => {
    expect(() => pythonToWorkspace('print(1)', 'ai')).toThrow(
      PythonDecompileError,
    );
    try {
      pythonToWorkspace('_motor.run_power(4, 50)\nprint(1)', 'ai');
    } catch (error) {
      expect(error).toBeInstanceOf(PythonDecompileError);
      expect((error as Error).message).toContain('第 2 行');
    }
  });
});
