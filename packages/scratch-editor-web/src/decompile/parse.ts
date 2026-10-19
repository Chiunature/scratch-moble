import {
  PythonDecompileError,
  type Expr,
  type ParsedProgram,
  type Stmt,
} from './ast';

type Line = { number: number; indent: number; text: string };

const MAPPING =
  /^#\s*@(var|list)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=>|=)\s*(.+?)\s*$/;

function fail(line: number, message: string): never {
  throw new PythonDecompileError(line, message);
}

function logicalLines(source: string): Line[] {
  const lines: Line[] = [];
  source.split(/\r?\n/).forEach((raw, index) => {
    const number = index + 1;
    if (!raw.trim() || raw.trim().startsWith('#')) return;
    const indent = raw.match(/^ */)?.[0].length ?? 0;
    if (raw[indent] === '\t') fail(number, '请使用空格缩进');
    lines.push({ number, indent, text: raw.trim() });
  });
  return lines;
}

class ExprParser {
  private index = 0;

  constructor(
    private readonly line: number,
    private readonly text: string,
  ) {}

  parse(): Expr {
    const expr = this.parseOr();
    this.skip();
    if (this.index < this.text.length) {
      fail(this.line, `表达式有多余内容：${this.text.slice(this.index)}`);
    }
    return expr;
  }

  private skip(): void {
    while (this.text[this.index] === ' ') this.index += 1;
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.consumeWord('or')) {
      left = { kind: 'binary', op: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.consumeWord('and')) {
      left = { kind: 'binary', op: 'and', left, right: this.parseNot() };
    }
    return left;
  }

  private parseNot(): Expr {
    this.skip();
    if (this.consumeWord('not')) {
      return { kind: 'unary', op: 'not', inner: this.parseNot() };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expr {
    let left = this.parseSum();
    const op = this.consumeOp(['==', '!=', '<=', '>=', '<', '>']);
    if (!op) return left;
    return { kind: 'binary', op, left, right: this.parseSum() };
  }

  private parseSum(): Expr {
    let left = this.parseProduct();
    while (true) {
      const op = this.consumeOp(['+', '-']);
      if (!op) return left;
      left = { kind: 'binary', op, left, right: this.parseProduct() };
    }
  }

  private parseProduct(): Expr {
    let left = this.parseUnary();
    while (true) {
      const op = this.consumeOp(['*', '/', '%']);
      if (!op) return left;
      left = { kind: 'binary', op, left, right: this.parseUnary() };
    }
  }

  private parseUnary(): Expr {
    this.skip();
    if (this.text[this.index] === '-' && /[\d.(]/.test(this.text[this.index + 1] ?? '')) {
      this.index += 1;
      const inner = this.parseUnary();
      if (inner.kind === 'number') return { kind: 'number', value: -inner.value };
      return { kind: 'unary', op: '-', inner };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    this.skip();
    const char = this.text[this.index];
    if (char === '(') {
      this.index += 1;
      const inner = this.parseOr();
      this.skip();
      if (this.text[this.index] !== ')') fail(this.line, '缺少右括号');
      this.index += 1;
      return inner;
    }
    if (char === '[') return this.parseList();
    if (char === '"' || char === "'") return this.parseString(char);
    if (/\d/.test(char ?? '')) return this.parseNumber();
    if (/[A-Za-z_]/.test(char ?? '')) return this.parseName();
    fail(this.line, '无法解析表达式');
  }

  private parseList(): Expr {
    this.index += 1;
    const items: Expr[] = [];
    this.skip();
    if (this.text[this.index] === ']') {
      this.index += 1;
      return { kind: 'list', items };
    }
    while (true) {
      items.push(this.parseOr());
      this.skip();
      if (this.text[this.index] === ',') {
        this.index += 1;
        continue;
      }
      if (this.text[this.index] === ']') {
        this.index += 1;
        return { kind: 'list', items };
      }
      fail(this.line, '列表字面量格式无效');
    }
  }

  private parseString(quote: string): Expr {
    this.index += 1;
    let value = '';
    while (this.index < this.text.length) {
      const char = this.text[this.index];
      if (char === '\\') {
        const next = this.text[this.index + 1];
        if (next === undefined) fail(this.line, '字符串转义不完整');
        value += next === 'n' ? '\n' : next;
        this.index += 2;
        continue;
      }
      if (char === quote) {
        this.index += 1;
        return { kind: 'string', value };
      }
      value += char;
      this.index += 1;
    }
    fail(this.line, '字符串没有结束');
  }

  private parseNumber(): Expr {
    const match = /^(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?)/.exec(
      this.text.slice(this.index),
    );
    if (!match) fail(this.line, '数字格式无效');
    this.index += match[0].length;
    return { kind: 'number', value: Number(match[0]) };
  }

  private parseName(): Expr {
    const name = this.readIdent();
    this.skip();
    if (name === 'True' || name === 'False') {
      return { kind: 'bool', value: name === 'True' };
    }
    if (this.text[this.index] === '.') {
      this.index += 1;
      const method = this.readIdent();
      this.skip();
      if (this.text[this.index] !== '(') fail(this.line, `${name}.${method} 必须是调用`);
      return { kind: 'attrCall', target: name, method, args: this.parseArgs() };
    }
    if (this.text[this.index] === '(') {
      return { kind: 'call', callee: name, args: this.parseArgs() };
    }
    return { kind: 'name', value: name };
  }

  private parseArgs(): Expr[] {
    if (this.text[this.index] !== '(') fail(this.line, '缺少参数列表');
    this.index += 1;
    const args: Expr[] = [];
    this.skip();
    if (this.text[this.index] === ')') {
      this.index += 1;
      return args;
    }
    while (true) {
      args.push(this.parseOr());
      this.skip();
      if (this.text[this.index] === ',') {
        this.index += 1;
        this.skip();
        continue;
      }
      if (this.text[this.index] === ')') {
        this.index += 1;
        return args;
      }
      fail(this.line, '参数列表格式无效');
    }
  }

  private readIdent(): string {
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.text.slice(this.index));
    if (!match) fail(this.line, '缺少标识符');
    this.index += match[0].length;
    return match[0];
  }

  private consumeWord(word: string): boolean {
    this.skip();
    if (!this.text.startsWith(word, this.index)) return false;
    const next = this.text[this.index + word.length];
    if (next && /[A-Za-z0-9_]/.test(next)) return false;
    this.index += word.length;
    return true;
  }

  private consumeOp(ops: string[]): string | null {
    this.skip();
    const found = ops.find(op => this.text.startsWith(op, this.index));
    if (!found) return null;
    this.index += found.length;
    return found;
  }
}

function parseExpr(line: number, text: string): Expr {
  return new ExprParser(line, text).parse();
}

function header(line: Line, pattern: RegExp): RegExpExecArray | null {
  return pattern.exec(line.text);
}

export function parsePythonProgram(source: string): ParsedProgram {
  const displayNames = new Map<string, { displayName: string; isList: boolean }>();
  source.split(/\r?\n/).forEach((raw, index) => {
    const match = MAPPING.exec(raw.trim());
    if (!match) return;
    displayNames.set(match[2], {
      displayName: match[3],
      isList: match[1] === 'list',
    });
  });
  const lines = logicalLines(source);
  const parsed = parseBlock(lines, 0, 0);
  if (parsed.next < lines.length) {
    fail(lines[parsed.next]!.number, '无法解析后续语句');
  }
  return { statements: parsed.statements, displayNames };
}

function parseBlock(
  lines: Line[],
  start: number,
  indent: number,
): { statements: Stmt[]; next: number } {
  const statements: Stmt[] = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index]!;
    if (line.indent < indent) break;
    if (line.indent > indent) {
      fail(line.number, '缩进不正确');
    }
    if (line.text === 'else:') {
      break;
    }
    index += 1;
    statements.push(parseStatement(lines, line, index, parsed => {
      index = parsed;
    }));
  }
  return { statements, next: index };
}

function parseStatement(
  lines: Line[],
  line: Line,
  nextIndex: number,
  setIndex: (index: number) => void,
): Stmt {
  if (line.text === 'break') return { kind: 'break', line: line.number };
  if (/^global\s+/.test(line.text)) return { kind: 'global', line: line.number };

  const listInit = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*PikaStdData\.List\(\)$/.exec(
    line.text,
  );
  if (listInit) return { kind: 'listInit', name: listInit[1]!, line: line.number };

  const assign =
    /^([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|=)\s*([\s\S]+)$/.exec(line.text);
  if (assign && assign[2] === '=' && !/^[^=]*=[^=]/.test(`${assign[1]}=`)) {
    return {
      kind: 'assign',
      name: assign[1]!,
      op: '=',
      value: parseExpr(line.number, assign[3]!),
      line: line.number,
    };
  }
  if (assign && assign[2] === '+=') {
    return {
      kind: 'assign',
      name: assign[1]!,
      op: '+=',
      value: parseExpr(line.number, assign[3]!),
      line: line.number,
    };
  }

  const whileTrue = line.text === 'while True:';
  const whileNot = /^while not \((.*)\)\s*:$/.exec(line.text);
  const forRange = /^for\s+[A-Za-z_][A-Za-z0-9_]*\s+in\s+range\((.*)\)\s*:$/.exec(
    line.text,
  );
  const ifHeader = /^if (.*):$/.exec(line.text);
  if (whileTrue || whileNot || forRange || ifHeader) {
    const body = parseBlock(lines, nextIndex, line.indent + 4);
    setIndex(body.next);
    if (whileTrue) return { kind: 'whileTrue', body: body.statements, line: line.number };
    if (whileNot) {
      return {
        kind: 'whileNot',
        cond: parseExpr(line.number, whileNot[1]!),
        body: body.statements,
        line: line.number,
      };
    }
    if (forRange) {
      return {
        kind: 'forRange',
        times: parseExpr(line.number, forRange[1]!),
        body: body.statements,
        line: line.number,
      };
    }
    let elseBody: Stmt[] = [];
    const next = lines[body.next];
    if (next && next.indent === line.indent && next.text === 'else:') {
      const parsedElse = parseBlock(lines, body.next + 1, line.indent + 4);
      elseBody = parsedElse.statements;
      setIndex(parsedElse.next);
    }
    return {
      kind: 'if',
      cond: parseExpr(line.number, ifHeader![1]!),
      thenBody: body.statements,
      elseBody,
      line: line.number,
    };
  }

  const expr = parseExpr(line.number, line.text);
  if (expr.kind !== 'attrCall') {
    fail(line.number, '只支持模块调用、赋值和控制流');
  }
  if (!expr.target.startsWith('_')) {
    return {
      kind: 'method',
      target: expr.target,
      method: expr.method,
      args: expr.args,
      line: line.number,
    };
  }
  return {
    kind: 'call',
    callee: `${expr.target}.${expr.method}`,
    args: expr.args,
    line: line.number,
  };
}
