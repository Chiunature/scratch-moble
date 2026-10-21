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

  it('decompiles motor pair, stop module and line-follow blocks', () => {
    const fragment = pythonToWorkspace(
      [
        '_motor.pair(4, 5, 3)',
        '_motor.mov_set_stop_module(1)',
        '_motor.mov_find_line_init()',
        '_motor.mov_find_line_run(0, 1, 80, 80, 0.1, 0.6)',
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
      'pair',
      'mov_set_stop_module',
      'mov_find_line_init',
      'mov_find_line_run',
    ]);
    expect(fragment.chain?.fields?.DIRECTION).toBe('3');
    expect(fragment.chain?.inputs?.PORTS?.shadow?.fields?.PORT).toBe('4,5');
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

  it('decompiles a custom block from display comments', () => {
    const fragment = pythonToWorkspace(
      [
        '# @custom qianjin => 前进 %n',
        '# @custom-arg qianjin bushu => 步数',
        'def qianjin(bushu):',
        "    _motor.mov_dir_power('advance', bushu)",
        'qianjin(40)',
      ].join('\n'),
      'ai',
    );
    const definition = fragment.procedures[0];
    const prototype = definition?.inputs?.custom_block?.block;
    expect(definition?.type).toBe('procedures_definition');
    expect(prototype?.type).toBe('procedures_prototype');
    expect(prototype?.extraState).toContain('前进 %n');
    expect(prototype?.extraState).toContain('步数');
    expect(definition?.next?.block.type).toBe('mov_dir_power');
    expect(
      definition?.next?.block.inputs?.POWER?.block?.type,
    ).toBe('argument_reporter_string_number');
    expect(definition?.next?.block.inputs?.POWER?.block?.fields?.VALUE).toBe('步数');
    expect(fragment.chain?.type).toBe('procedures_call');
    expect(fragment.chain?.extraState).toContain('前进 %n');
  });

  it('decompiles a custom block with a number hole and a boolean hole', () => {
    const fragment = pythonToWorkspace(
      [
        '# @custom qianjin => 前进 %n %b',
        '# @custom-arg qianjin bushu => 步数',
        '# @custom-arg qianjin kaiguan => 开关',
        'def qianjin(bushu, kaiguan):',
        '    if kaiguan:',
        "        _motor.mov_dir_power('advance', bushu)",
        'qianjin(40, not _touch.state(0))',
      ].join('\n'),
      'ai',
    );
    const prototype = fragment.procedures[0]?.inputs?.custom_block?.block;
    const condition = fragment.procedures[0]?.next?.block;
    expect(prototype?.extraState).toContain('前进 %n %b');
    expect(prototype?.extraState).toContain('步数');
    expect(prototype?.extraState).toContain('开关');
    expect(condition?.type).toBe('control_if');
    expect(condition?.inputs?.CONDITION?.block?.type).toBe(
      'argument_reporter_boolean',
    );
    expect(condition?.inputs?.CONDITION?.block?.fields?.VALUE).toBe('开关');
    const power =
      condition?.inputs?.SUBSTACK?.block?.inputs?.POWER?.block;
    expect(power?.type).toBe('argument_reporter_string_number');
    expect(power?.fields?.VALUE).toBe('步数');
    const callInputs = Object.values(fragment.chain?.inputs ?? {});
    expect(callInputs[0]?.shadow?.fields?.NUM).toBe(40);
    expect(callInputs[1]?.block?.type).toBe('operator_not');
  });

  it('decompiles a boolean hole on a custom block', () => {
    const fragment = pythonToWorkspace(
      [
        '# @custom go => 执行 %b',
        'def go(enabled):',
        '    if enabled:',
        '        _motor.mov_stop()',
        'go(not _touch.state(0))',
      ].join('\n'),
      'ai',
    );
    const body = fragment.procedures[0]?.next?.block;
    expect(body?.type).toBe('control_if');
    expect(body?.inputs?.CONDITION?.block?.type).toBe('argument_reporter_boolean');
    expect(fragment.chain?.inputs).toBeDefined();
    const callInput = Object.values(fragment.chain?.inputs ?? {})[0];
    expect(callInput?.block?.type).toBe('operator_not');
  });

  it('uses the function name when a custom block has no display comment', () => {
    const fragment = pythonToWorkspace('def qianjin(bushu):\n    pass\nqianjin(1)\n', 'ai');
    expect(fragment.procedures[0]?.inputs?.custom_block?.block?.extraState).toContain(
      'qianjin %n',
    );
  });

  it('rejects a custom block whose holes do not match its parameters', () => {
    expect(() =>
      pythonToWorkspace(
        '# @custom qianjin => 前进 %n %b\ndef qianjin(bushu):\n    pass\n',
        'ai',
      ),
    ).toThrow('注释里有 2 个孔');
  });

  it('folds elif into nested if-else blocks', () => {
    const fragment = pythonToWorkspace(
      [
        'if (_touch.state(0)):',
        '    _motor.mov_stop()',
        'elif (_color.cmp_lux(0, ">", 50)):',
        "    _matrix.show_roll(str('A'))",
        'else:',
        '    _motor.mov_dir_power("advance", 30)',
      ].join('\n'),
      'ai',
    );
    expect(fragment.chain?.type).toBe('control_if_else');
    const nested = fragment.chain?.inputs?.SUBSTACK2?.block;
    expect(nested?.type).toBe('control_if_else');
    expect(nested?.inputs?.SUBSTACK?.block?.type).toBe('show_roll');
    expect(nested?.inputs?.SUBSTACK2?.block?.type).toBe('mov_dir_power');
  });

  it('decompiles operators and list reporters used on the phone', () => {
    const fragment = pythonToWorkspace(
      [
        '# @list marks => 分数',
        '# @var n => 数',
        'n = _random.randint(1, 10)',
        'n = _math.round(n)',
        'n = _math.abs(n)',
        'marks.append(n)',
        'n = marks[1]',
        'n = marks.num()',
        'n = marks.dataToindex(3)',
        "n = len(str('ab'))",
        "n = str('a') + str('b')",
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
      'data_setvariableto',
      'data_setvariableto',
      'data_setvariableto',
      'data_addtolist',
      'data_setvariableto',
      'data_setvariableto',
      'data_setvariableto',
      'data_setvariableto',
      'data_setvariableto',
    ]);
    expect(fragment.chain?.inputs?.VALUE?.block?.type).toBe('operator_random');
    const contains = pythonToWorkspace(
      "if (str('a') in str('ab')):\n    _motor.mov_stop()\n",
      'ai',
    );
    expect(contains.chain?.inputs?.CONDITION?.block?.type).toBe(
      'operator_contains',
    );
    const letter = pythonToWorkspace(
      "n = (str('ab')[int(1) - 1])\n",
      'ai',
    );
    expect(letter.chain?.inputs?.VALUE?.block?.type).toBe('operator_letter_of');
  });

  it('treats quote style and Chinese variable display names as the same program', () => {
    expect(normalizeAssistantPython("_motor.mov_dir_power('advance', 40)")).toBe(
      normalizeAssistantPython('_motor.mov_dir_power("advance", 40)'),
    );
    expect(
      normalizeAssistantPython('# @var speed => 速度\nspeed = 40'),
    ).toBe(normalizeAssistantPython('sudu = 40'));
  });

  it('treats custom-arg python names as the display-name pinyin', () => {
    expect(
      normalizeAssistantPython(
        [
          '# @custom qianjin => 前进 %n %b',
          '# @custom-arg qianjin bushu => 步数',
          '# @custom-arg qianjin kai => 开关',
          'def qianjin(bushu, kai):',
          '    if kai:',
          "        _motor.mov_dir_power('advance', bushu)",
          'qianjin(40, not _touch.state(0))',
        ].join('\n'),
      ),
    ).toBe(
      normalizeAssistantPython(
        [
          '# @custom qianjin => 前进 %n %b',
          '# @custom-arg qianjin bushu => 步数',
          '# @custom-arg qianjin kaiguan => 开关',
          'def qianjin(bushu, kaiguan):',
          '    if kaiguan:',
          '_motor.mov_dir_power("advance", bushu)',
          'qianjin(40, not (_touch.state(0)))',
        ].join('\n'),
      ),
    );
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
