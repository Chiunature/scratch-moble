import {
  assertValidBytecode,
  decodeHexPayload,
  getBytecodeSize,
  hexPreview,
  isCompilablePythonSource,
  mapPikaMessage,
  mapPikaOutcomeBase,
  type PikaDiagnosticInput,
} from '../src';

describe('decodeHexPayload', () => {
  it('解析偶数长度 hex 为字节数组', () => {
    expect(Array.from(decodeHexPayload('0f70796f'))).toEqual([0x0f, 0x70, 0x79, 0x6f]);
  });

  it('空串或奇数长度返回空数组', () => {
    expect(decodeHexPayload('').length).toBe(0);
    expect(decodeHexPayload('abc').length).toBe(0);
  });
});

describe('getBytecodeSize / hexPreview', () => {
  it('按 hex 编码计算字节数与截断预览', () => {
    expect(getBytecodeSize('0f70796f', 'hex')).toBe(4);
    expect(hexPreview('0f70796f', 'hex')).toBe('0f70796f');
    expect(hexPreview('0f70796f', 'hex', 2)).toBe('0f70');
  });

  it('utf8 数据按字符数计算', () => {
    expect(getBytecodeSize('pyo', 'utf8')).toBe(3);
  });

  it('无数据返回 0 / 空串', () => {
    expect(getBytecodeSize(undefined, 'hex')).toBe(0);
    expect(hexPreview(undefined, 'utf8')).toBe('');
  });
});

describe('assertValidBytecode', () => {
  it('空文件抛错', () => {
    expect(() => assertValidBytecode([])).toThrow('字节码文件为空');
  });

  it('magic 不符抛错', () => {
    expect(() => assertValidBytecode([1, 2, 3, 4])).toThrow('字节码格式无效');
  });

  it('合法 magic 通过', () => {
    expect(() => assertValidBytecode([0x0f, 0x70, 0x79, 0x6f])).not.toThrow();
  });
});

describe('isCompilablePythonSource', () => {
  it('空串与占位文案不可编译', () => {
    expect(isCompilablePythonSource('  ')).toBe(false);
    expect(isCompilablePythonSource('// 占位')).toBe(false);
    expect(isCompilablePythonSource('# 拖拽飞出栏积木后生成 Python 代码')).toBe(false);
  });

  it('真实 Python 可编译', () => {
    expect(isCompilablePythonSource("print('hi')")).toBe(true);
  });
});

describe('mapPikaMessage', () => {
  it('成功且有输出时优先展示输出', () => {
    const input: PikaDiagnosticInput = {
      ok: true,
      message: 'ok',
      output: 'hello',
    };
    expect(mapPikaMessage(input)).toBe('hello');
  });

  it('成功无输出时回落 message', () => {
    const input: PikaDiagnosticInput = { ok: true, message: 'ok' };
    expect(mapPikaMessage(input)).toBe('ok');
  });

  it('失败映射为中文标签 + 出错代码片段', () => {
    const input: PikaDiagnosticInput = {
      ok: false,
      errorName: 'SYNTAX_ERROR',
      phase: 'compile',
      message: 'error: syntax error',
      output: '----\n[1]\nprint(\n----',
    };
    const message = mapPikaMessage(input);
    expect(message).toContain('语法错误');
    expect(message).toContain('编译');
    expect(message).toContain('[1]');
  });
});

describe('mapPikaOutcomeBase', () => {
  it('透传 ok / phase / output 等字段', () => {
    const input: PikaDiagnosticInput = {
      ok: true,
      output: 'out',
      outputTruncated: true,
      phase: 'execute',
    };
    const outcome = mapPikaOutcomeBase(input);
    expect(outcome).toMatchObject({
      ok: true,
      output: 'out',
      outputTruncated: true,
      phase: 'execute',
    });
    expect(outcome.message).toContain('截断');
  });
});