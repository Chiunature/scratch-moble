import { pinyin } from 'pinyin-pro';

const PYTHON_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const CJK_CHAR = /\p{Script=Han}/u;

/** 将 Scratch 变量/列表显示名转为合法 Python 标识符；中文按字转拼音。 */
export function displayNameToPythonIdentifier(raw: string): string {
  if (PYTHON_IDENTIFIER.test(raw)) {
    return raw;
  }

  let out = '';
  for (const char of raw) {
    if (CJK_CHAR.test(char)) {
      out += pinyin(char, { toneType: 'none' });
    } else if (/[A-Za-z0-9_]/.test(char)) {
      out += char;
    } else {
      out += '_';
    }
  }

  out = out.replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (!out) {
    return 'unnamed_var';
  }
  if (!/^[A-Za-z_]/.test(out)) {
    out = `_${out}`;
  }
  return out;
}
