/**
 * 过滤、规范化后的物理行出现次数是比较单位。
 * 不保留位置、缩进、所属分支或积木身份。
 *
 * 自动生成内容按文本启发式跳过（非来源判定）：
 * 前导 global、前导 name = 0 / PikaStdData.List()、任意位置的 _os.sleep_s(0.001)。
 * 用户写出的同形语句也会被忽略。
 */

const METADATA_COMMENT =
  /^#\s*@(?:var|list|custom|custom-arg|sparkai-custom-arg)\b/;

const TOP_LEVEL_KEYWORD = /^(?:not|and|or|if|elif|else|while|for|def|in|is)\b/;

/** 把字符串折成 JSON 双引号形式，便于比较。 */
export function canonicalizePythonQuotes(source: string): string {
  let result = '';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (char !== '"' && char !== "'") {
      result += char;
      continue;
    }
    let value = '';
    index += 1;
    while (index < source.length) {
      const current = source[index]!;
      if (current === '\\') {
        const next = source[index + 1];
        value += next === 'n' ? '\n' : (next ?? '');
        index += 2;
        continue;
      }
      if (current === char) break;
      value += current;
      index += 1;
    }
    result += JSON.stringify(value);
  }
  return result;
}

/** 仅去掉字符串外的注释；字符串内的 # 保留。 */
export function stripPythonCommentOutsideStrings(line: string): string {
  let result = '';
  let quote: string | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (quote) {
      result += char;
      if (char === '\\') {
        result += line[index + 1] ?? '';
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }
    if (char === '#') break;
    result += char;
  }
  return result.trimEnd();
}

/** 折叠字符串外空白；字符串内部空格保留。 */
export function foldPythonWhitespaceOutsideStrings(line: string): string {
  let result = '';
  let quote: string | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (quote) {
      result += char;
      if (char === '\\') {
        result += line[index + 1] ?? '';
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }
    if (char === ' ' || char === '\t') continue;
    result += char;
  }
  return result;
}

function findMatchingParen(source: string, openIndex: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index]!;
    if (quote) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function isCallOrIndexParen(source: string, openIndex: number): boolean {
  let index = openIndex - 1;
  while (index >= 0 && (source[index] === ' ' || source[index] === '\t')) {
    index -= 1;
  }
  if (index < 0) return false;
  const prev = source[index]!;
  if (prev === ']' || prev === ')') return true;
  if (!/[A-Za-z0-9_]/.test(prev)) return false;
  let start = index;
  while (start > 0 && /[A-Za-z0-9_]/.test(source[start - 1]!)) start -= 1;
  const word = source.slice(start, index + 1);
  // not (_touch.state(0)) 不是调用；_touch.state(0) 才是。
  if (TOP_LEVEL_KEYWORD.test(word)) return false;
  return true;
}

/** 括号内是否为单个原子（标识符、字面量、调用链），不含顶层二元运算。 */
export function pythonContentIsAtom(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  let depth = 0;
  let quote: string | null = null;
  let word = '';
  const flushWord = () => {
    if (!word) return true;
    if (TOP_LEVEL_KEYWORD.test(word) && depth === 0) {
      word = '';
      return false;
    }
    word = '';
    return true;
  };
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index]!;
    if (quote) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      if (!flushWord()) return false;
      quote = char;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      word += char;
      continue;
    }
    if (word && /[0-9]/.test(char)) {
      word += char;
      continue;
    }
    if (!flushWord()) return false;
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      if (depth < 0) return false;
      continue;
    }
    if (depth === 0) {
      if (char === ' ' || char === '\t') continue;
      if (char === '.') continue;
      if ('+-*/%<>=!&|^~,'.includes(char)) return false;
    }
  }
  if (!flushWord()) return false;
  return depth === 0;
}

/** 去掉包住单个原子、且不改变运算优先级的括号。 */
export function stripRedundantPythonParens(line: string): string {
  let current = line;
  let changed = true;
  while (changed) {
    changed = false;
    let quote: string | null = null;
    for (let index = 0; index < current.length; index += 1) {
      const char = current[index]!;
      if (quote) {
        if (char === '\\') {
          index += 1;
          continue;
        }
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char !== '(') continue;
      if (isCallOrIndexParen(current, index)) continue;
      const close = findMatchingParen(current, index);
      if (close < 0) continue;
      const inner = current.slice(index + 1, close);
      if (!pythonContentIsAtom(inner)) continue;
      current = current.slice(0, index) + inner.trim() + current.slice(close + 1);
      changed = true;
      break;
    }
  }
  return current;
}

/** 单行比较键：注释规则、空白折叠、多余括号剥离。 */
export function normalizePythonStatementKey(line: string): string {
  const withoutComment = METADATA_COMMENT.test(line.trim())
    ? line.trim()
    : stripPythonCommentOutsideStrings(line).trim();
  if (!withoutComment) return '';
  const quoted = canonicalizePythonQuotes(withoutComment);
  const withoutParens = stripRedundantPythonParens(quoted);
  return foldPythonWhitespaceOutsideStrings(withoutParens);
}

const CONTROL_PATH_PREFIX = /^(?:(?:while|for|if|elif|else|def)(?:\/(?:while|for|if|elif|else|def))*)\|/;

/**
 * 声明行比较键：保留 while/if/... 控制流路径前缀，再规范化语句正文。
 * 例：while/if|_motor.stop(4)
 */
export function normalizePythonStatementKeyWithPath(line: string): string {
  const trimmed = line.trim();
  const match = CONTROL_PATH_PREFIX.exec(trimmed);
  if (match) {
    const path = match[0].slice(0, -1);
    const body = normalizePythonStatementKey(trimmed.slice(match[0].length));
    return body ? `${path}|${body}` : '';
  }
  return normalizePythonStatementKey(trimmed);
}

function isLeadingGlobal(line: string): boolean {
  return /^global\s+/.test(line.trim());
}

function isLeadingInit(line: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]* = (?:0|PikaStdData\.List\(\))$/.test(
    line.trim(),
  );
}

/** 编辑器生成 Python 使用 4 空格缩进。 */
const INDENT_WIDTH = 4;

type ControlFrame = { indent: number; kind: string };

function leadingIndentColumns(raw: string): number {
  let spaces = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]!;
    if (char === ' ') spaces += 1;
    else if (char === '\t') spaces += INDENT_WIDTH;
    else break;
  }
  return Math.floor(spaces / INDENT_WIDTH) * INDENT_WIDTH;
}

function controlKind(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.endsWith(':')) return null;
  if (/^while\b/.test(trimmed)) return 'while';
  if (/^for\b/.test(trimmed)) return 'for';
  if (/^if\b/.test(trimmed)) return 'if';
  if (/^elif\b/.test(trimmed)) return 'elif';
  if (/^else\s*:/.test(trimmed)) return 'else';
  if (/^def\b/.test(trimmed)) return 'def';
  return null;
}

function withControlPath(path: string[], bodyKey: string): string {
  if (!bodyKey) return '';
  return path.length > 0 ? `${path.join('/')}|${bodyKey}` : bodyKey;
}

export type AssistantPythonStatementOptions = {
  /** 是否保留 # @var / # @custom 等元数据注释。diff 为 true；回环比较为 false。 */
  includeMetadata?: boolean;
};

/**
 * 抽出可比较的语句行。
 * includeMetadata 默认 true（授权 diff）；回环比较传 false。
 * 键带控制流路径：循环/分支内为 while/if|语句。
 */
export function assistantPythonStatements(
  source: string,
  options: AssistantPythonStatementOptions = {},
): string[] {
  const includeMetadata = options.includeMetadata !== false;
  const kept: string[] = [];
  let skippingLead = true;
  const stack: ControlFrame[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const indent = leadingIndentColumns(raw);
    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }
    const path = stack.map(frame => frame.kind);
    if (METADATA_COMMENT.test(trimmed)) {
      if (!includeMetadata) continue;
      skippingLead = false;
      const key = withControlPath(path, normalizePythonStatementKey(trimmed));
      if (key) kept.push(key);
      continue;
    }
    const withoutComment = stripPythonCommentOutsideStrings(raw).trim();
    if (!withoutComment) continue;
    const key = normalizePythonStatementKey(withoutComment);
    if (!key) continue;
    if (key === '_os.sleep_s(0.001)') continue;
    if (skippingLead && isLeadingGlobal(withoutComment)) continue;
    if (skippingLead && isLeadingInit(withoutComment)) continue;
    skippingLead = false;
    kept.push(withControlPath(path, key));
    const kind = controlKind(withoutComment);
    if (kind) stack.push({ indent, kind });
  }
  return kept;
}

/** 整份程序规范化串，默认不含元数据注释（供回环比较）。 */
export function normalizeAssistantPythonSource(
  source: string,
  options: AssistantPythonStatementOptions = { includeMetadata: false },
): string {
  return assistantPythonStatements(source, {
    includeMetadata: options.includeMetadata === true,
  }).join('\n');
}

export function isEmptyAssistantPythonSource(source: string): boolean {
  return normalizeAssistantPythonSource(source).length === 0;
}
