import {
  PythonDecompileError,
  type CustomParam,
  type CustomParamKind,
  type Expr,
  type ParsedProgram,
  type Stmt,
} from './ast';

type Line = { number: number; indent: number; text: string };

const MAPPING =
  /^#\s*@(var|list)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=>|=)\s*(.+?)\s*$/;
const CUSTOM_ARG_MAPPING =
  /^#\s*@(?:sparkai-custom-arg|custom-arg)\s+([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=>|=)\s*(.+?)\s*$/;
const CUSTOM_MAPPING =
  /^#\s*@(?:sparkai-custom|custom)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=>|=)\s*(.+?)\s*$/;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

type CustomTemplate = { proccode: string; line: number };
type CustomMaps = {
  templates: Map<string, CustomTemplate>;
  argumentNames: Map<string, Map<string, string>>;
  procedureNames: Set<string>;
};

function customMappings(source: string): CustomMaps {
  const templates = new Map<string, CustomTemplate>();
  const argumentNames = new Map<string, Map<string, string>>();
  const procedureNames = new Set<string>();
  source.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const text = raw.trim();
    const defined = /^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(text);
    if (defined) procedureNames.add(defined[1]!);
    const argument = CUSTOM_ARG_MAPPING.exec(text);
    if (argument) {
      const names = argumentNames.get(argument[1]!) ?? new Map<string, string>();
      if (names.has(argument[2]!)) {
        fail(line, `参数 ${argument[1]}.${argument[2]} 的显示名重复`);
      }
      names.set(argument[2]!, argument[3]!);
      argumentNames.set(argument[1]!, names);
      return;
    }
    const template = CUSTOM_MAPPING.exec(text);
    if (!template) return;
    if (templates.has(template[1]!)) {
      fail(line, `自制积木 ${template[1]} 的注释重复`);
    }
    templates.set(template[1]!, { proccode: template[2]!, line });
  });
  return { templates, argumentNames, procedureNames };
}

export function parsePythonProgram(source: string): ParsedProgram {
  const displayNames = new Map<string, { displayName: string; isList: boolean }>();
  source.split(/\r?\n/).forEach(raw => {
    const match = MAPPING.exec(raw.trim());
    if (!match) return;
    displayNames.set(match[2]!, {
      displayName: match[3]!,
      isList: match[1] === 'list',
    });
  });
  const custom = customMappings(source);
  const lines = logicalLines(source);
  const parsed = parseBlock(lines, 0, 0, custom);
  if (parsed.next < lines.length) {
    fail(lines[parsed.next]!.number, '无法解析后续语句');
  }
  const defined = new Set(
    parsed.statements.flatMap(statement =>
      statement.kind === 'def' ? [statement.name] : [],
    ),
  );
  for (const [name, template] of custom.templates) {
    if (!defined.has(name)) fail(template.line, `注释里的函数 ${name} 没有定义`);
  }
  for (const [name, argumentsByParam] of custom.argumentNames) {
    if (!defined.has(name)) fail(1, `注释里的函数 ${name} 没有定义`);
    const statement = parsed.statements.find(
      (item): item is Extract<Stmt, { kind: 'def' }> =>
        item.kind === 'def' && item.name === name,
    );
    for (const param of argumentsByParam.keys()) {
      if (!statement?.params.some(item => item.pythonName === param)) {
        fail(1, `注释里的参数 ${name}.${param} 不存在`);
      }
    }
  }
  return { statements: parsed.statements, displayNames };
}

function parseBlock(
  lines: Line[],
  start: number,
  indent: number,
  custom: CustomMaps,
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
    statements.push(
      parseStatement(lines, line, index, custom, parsed => {
        index = parsed;
      }),
    );
  }
  return { statements, next: index };
}

function parseDefinition(
  lines: Line[],
  line: Line,
  nextIndex: number,
  custom: CustomMaps,
  setIndex: (index: number) => void,
): Stmt {
  if (line.indent !== 0) fail(line.number, '自制积木只能写在最外层');
  const headerMatch = /^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:$/.exec(
    line.text,
  );
  if (!headerMatch) fail(line.number, '函数定义只能写成 def 名称(参数):');
  const name = headerMatch[1]!;
  const pythonNames = headerMatch[2]!
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  if (pythonNames.some(item => !IDENTIFIER.test(item))) {
    fail(line.number, '自制积木的参数必须是简单名称');
  }
  if (new Set(pythonNames).size !== pythonNames.length) {
    fail(line.number, '自制积木的参数名重复');
  }
  const template = custom.templates.get(name);
  const kinds = template ? procCodeKinds(template.proccode, line.number) : [];
  if (template && kinds.length !== pythonNames.length) {
    fail(
      line.number,
      `注释里有 ${kinds.length} 个孔，函数有 ${pythonNames.length} 个参数`,
    );
  }
  const argumentNames = custom.argumentNames.get(name);
  const params: CustomParam[] = pythonNames.map((pythonName, index) => ({
    pythonName,
    displayName: argumentNames?.get(pythonName) ?? pythonName,
    kind: kinds[index] ?? 'n',
  }));
  const body = parseBlock(lines, nextIndex, line.indent + 4, custom);
  setIndex(body.next);
  return {
    kind: 'def',
    name,
    params,
    proccode: template?.proccode ?? defaultProcCode(name, params.length),
    body: body.statements,
    line: line.number,
  };
}

function procCodeKinds(proccode: string, line: number): CustomParamKind[] {
  const kinds: CustomParamKind[] = [];
  const pattern = /%([nbs])/g;
  let match = pattern.exec(proccode);
  while (match) {
    kinds.push(match[1] as CustomParamKind);
    match = pattern.exec(proccode);
  }
  if (kinds.length === 0 && proccode.includes('%')) {
    fail(line, '自制积木的孔只能是 %n 或 %b');
  }
  return kinds;
}

function defaultProcCode(name: string, count: number): string {
  if (count === 0) return name;
  return `${name}${Array.from({ length: count }, () => ' %n').join('')}`;
}

function parseStatement(
  lines: Line[],
  line: Line,
  nextIndex: number,
  custom: CustomMaps,
  setIndex: (index: number) => void,
): Stmt {
  if (line.text === 'break') return { kind: 'break', line: line.number };
  if (line.text === 'pass') return { kind: 'pass', line: line.number };
  if (/^global\s+/.test(line.text)) return { kind: 'global', line: line.number };
  if (line.text.startsWith('def ')) {
    return parseDefinition(lines, line, nextIndex, custom, setIndex);
  }

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
    const body = parseBlock(lines, nextIndex, line.indent + 4, custom);
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
      const parsedElse = parseBlock(lines, body.next + 1, line.indent + 4, custom);
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
  if (expr.kind === 'call' && custom.procedureNames.has(expr.callee)) {
    return {
      kind: 'procCall',
      name: expr.callee,
      args: expr.args,
      line: line.number,
    };
  }
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
