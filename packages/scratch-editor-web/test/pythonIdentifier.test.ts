import { displayNameToPythonIdentifier } from '../src/codegen/pythonIdentifier';

describe('displayNameToPythonIdentifier', () => {
  test('keeps valid ASCII identifiers', () => {
    expect(displayNameToPythonIdentifier('my_var')).toBe('my_var');
    expect(displayNameToPythonIdentifier('_count2')).toBe('_count2');
  });

  test('converts Chinese characters to pinyin', () => {
    expect(displayNameToPythonIdentifier('计数')).toBe('jishu');
    expect(displayNameToPythonIdentifier('我的变量')).toBe('wodebianliang');
  });

  test('replaces invalid characters with underscores', () => {
    expect(displayNameToPythonIdentifier('a-b c')).toBe('a_b_c');
  });

  test('prefixes identifiers that start with a digit', () => {
    expect(displayNameToPythonIdentifier('123')).toBe('_123');
  });

  test('falls back when the name is empty after sanitization', () => {
    expect(displayNameToPythonIdentifier('!!!')).toBe('unnamed_var');
  });
});
