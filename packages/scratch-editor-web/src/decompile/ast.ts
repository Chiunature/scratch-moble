export class PythonDecompileError extends Error {
  readonly line: number;

  constructor(line: number, message: string) {
    super(`第 ${line} 行：${message}`);
    this.name = 'PythonDecompileError';
    this.line = line;
  }
}

export type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'name'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'list'; items: Expr[] }
  | { kind: 'unary'; op: '-' | 'not'; inner: Expr }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
  | { kind: 'call'; callee: string; args: Expr[] }
  | { kind: 'attrCall'; target: string; method: string; args: Expr[] };

export type Stmt =
  | { kind: 'call'; callee: string; args: Expr[]; line: number }
  | {
      kind: 'method';
      target: string;
      method: string;
      args: Expr[];
      line: number;
    }
  | { kind: 'assign'; name: string; op: '=' | '+='; value: Expr; line: number }
  | { kind: 'listInit'; name: string; line: number }
  | { kind: 'global'; line: number }
  | { kind: 'break'; line: number }
  | { kind: 'whileTrue'; body: Stmt[]; line: number }
  | { kind: 'whileNot'; cond: Expr; body: Stmt[]; line: number }
  | { kind: 'forRange'; times: Expr; body: Stmt[]; line: number }
  | { kind: 'if'; cond: Expr; thenBody: Stmt[]; elseBody: Stmt[]; line: number };

export type ParsedProgram = {
  statements: Stmt[];
  displayNames: Map<string, { displayName: string; isList: boolean }>;
};
