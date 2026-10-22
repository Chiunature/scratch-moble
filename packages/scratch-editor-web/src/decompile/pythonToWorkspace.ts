import {
  isEmptyAssistantPythonSource,
  normalizeAssistantPythonSource,
} from '@scratch-mobile/assistant-contracts';
import {
  NOTE_PITCH_MAX,
  pitchToDisplayName,
} from '@scratch-mobile/shared';

import { BLOCK_TYPES } from '../blocks/blockTypes';
import { displayNameToPythonIdentifier } from '../codegen/pythonIdentifier';
import {
  PythonDecompileError,
  type CustomParam,
  type Expr,
  type Stmt,
} from './ast';
import { parsePythonProgram } from './parse';

export type EmittedBlock = {
  id: string;
  type: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: EmittedBlock; shadow?: EmittedBlock }>;
  next?: { block: EmittedBlock };
  extraState?: string;
  x?: number;
  y?: number;
};

export type EmittedVariable = {
  id: string;
  name: string;
  type?: string;
};

export type PythonWorkspaceFragment = {
  chain?: EmittedBlock;
  procedures: EmittedBlock[];
  variables: EmittedVariable[];
};

type BoundParam = CustomParam & { id: string };
type ProcedureInfo = { proccode: string; params: BoundParam[] };
type ValueSlot = 'value' | 'boolean';

const notePitch = new Map<string, number>();
for (let pitch = 0; pitch <= NOTE_PITCH_MAX; pitch += 1) {
  notePitch.set(pitchToDisplayName(pitch), pitch);
}

const DIRECTIONS = new Set(['advance', 'retreat', 'left', 'right']);
const SHANK_KEYS = new Set(['up', 'down', 'left', 'right', 'y', 'a', 'x', 'b']);

class Emitter {
  private sequence = 0;
  private readonly variables = new Map<
    string,
    { id: string; isList: boolean; displayName: string }
  >();
  private readonly procedures = new Map<string, ProcedureInfo>();
  private parameters = new Map<string, BoundParam>();

  constructor(
    private readonly prefix: string,
    displayNames: Map<string, { displayName: string; isList: boolean }>,
  ) {
    for (const [name, info] of displayNames) {
      this.ensureVariable(name, info.isList, info.displayName);
    }
  }

  emit(statements: Stmt[]): PythonWorkspaceFragment {
    const definitions = statements.filter(
      (statement): statement is Extract<Stmt, { kind: 'def' }> =>
        statement.kind === 'def',
    );
    this.prepareProcedures(definitions);
    const procedures = definitions.map((statement, index) =>
      this.procedureDefinition(statement, index),
    );
    const main = statements.filter(statement => statement.kind !== 'def');
    return {
      chain: link(this.statements(main)),
      procedures,
      variables: [...this.variables.values()].map(variable => ({
        id: variable.id,
        name: variable.displayName,
        ...(variable.isList ? { type: 'list' } : {}),
      })),
    };
  }

  private id(): string {
    this.sequence += 1;
    return `${this.prefix}-${this.sequence}`;
  }

  private ensureVariable(
    name: string,
    isList: boolean,
    displayName = name,
  ): string {
    const existing = this.variables.get(name);
    if (existing) {
      if (existing.isList !== isList) {
        throw new PythonDecompileError(1, `变量 ${name} 不能同时是列表和标量`);
      }
      return existing.id;
    }
    const id = this.id();
    this.variables.set(name, { id, isList, displayName });
    return id;
  }

  private parameterValue(
    param: BoundParam,
    line: number,
    slot: ValueSlot,
  ): EmittedBlock {
    if (slot === 'boolean' && param.kind !== 'b') {
      throw new PythonDecompileError(
        line,
        `参数 ${param.displayName} 不是是否孔，不能当作条件`,
      );
    }
    if (slot === 'value' && param.kind === 'b') {
      throw new PythonDecompileError(
        line,
        `参数 ${param.displayName} 是是否孔，不能当作数字`,
      );
    }
    return this.argumentReporter(param);
  }

  private statements(statements: Stmt[]): EmittedBlock[] {
    return statements.flatMap(statement => {
      const block = this.statement(statement);
      return block ? [block] : [];
    });
  }

  private statement(statement: Stmt): EmittedBlock | null {
    switch (statement.kind) {
      case 'global':
      case 'listInit':
      case 'pass':
        if (statement.kind === 'listInit') this.ensureVariable(statement.name, true);
        return null;
      case 'def':
        throw new PythonDecompileError(statement.line, '自制积木只能写在最外层');
      case 'procCall':
        return this.procedureCall(statement);
      case 'break':
        return { id: this.id(), type: BLOCK_TYPES.control.break };
      case 'assign':
        return this.assign(statement);
      case 'method':
        return this.listMethod(statement);
      case 'call':
        return this.call(statement);
      case 'whileTrue':
        return this.cBlock(
          BLOCK_TYPES.control.while,
          {},
          this.withoutTick(statement.body),
        );
      case 'forRange':
        return this.cBlock(
          BLOCK_TYPES.control.whileTimes,
          { TIMES: this.value(statement.times, statement.line) },
          this.withoutTick(statement.body),
        );
      case 'whileNot':
        if (this.isWait(statement.body)) {
          return this.cBlock(BLOCK_TYPES.control.wait, {
            CONDITION: this.value(statement.cond, statement.line, 'boolean'),
          });
        }
        return this.cBlock(
          BLOCK_TYPES.control.whileDo,
          { CONDITION: this.value(statement.cond, statement.line, 'boolean') },
          this.withoutTick(statement.body),
        );
      case 'if':
        return this.cBlock(
          statement.elseBody.length
            ? BLOCK_TYPES.control.ifElse
            : BLOCK_TYPES.control.if,
          { CONDITION: this.value(statement.cond, statement.line, 'boolean') },
          statement.thenBody,
          statement.elseBody,
        );
      default: {
        const unreachable: never = statement;
        return unreachable;
      }
    }
  }

  private cBlock(
    type: string,
    inputs: Record<string, { block?: EmittedBlock; shadow?: EmittedBlock }>,
    body: Stmt[] = [],
    elseBody: Stmt[] = [],
  ): EmittedBlock {
    const block: EmittedBlock = { id: this.id(), type, inputs };
    const first = link(this.statements(body));
    if (first) block.inputs = { ...block.inputs, SUBSTACK: { block: first } };
    const second = link(this.statements(elseBody));
    if (second) block.inputs = { ...block.inputs, SUBSTACK2: { block: second } };
    return block;
  }

  private withoutTick(body: Stmt[]): Stmt[] {
    const last = body[body.length - 1];
    if (
      last?.kind === 'call' &&
      last.callee === '_os.sleep_s' &&
      last.args.length === 1 &&
      last.args[0]?.kind === 'number' &&
      last.args[0].value === 0.001
    ) {
      return body.slice(0, -1);
    }
    return body;
  }

  private isWait(body: Stmt[]): boolean {
    const kept = this.withoutTick(body);
    return kept.length === 0;
  }

  private prepareProcedures(
    definitions: Extract<Stmt, { kind: 'def' }>[],
  ): void {
    for (const statement of definitions) {
      if (this.procedures.has(statement.name)) {
        throw new PythonDecompileError(statement.line, `函数 ${statement.name} 重复定义`);
      }
      this.procedures.set(statement.name, {
        proccode: statement.proccode,
        params: statement.params.map(param => ({ ...param, id: this.id() })),
      });
    }
  }

  private procedureDefinition(
    statement: Extract<Stmt, { kind: 'def' }>,
    index: number,
  ): EmittedBlock {
    const info = this.procedures.get(statement.name);
    if (!info) {
      throw new PythonDecompileError(statement.line, `函数 ${statement.name} 没有定义`);
    }
    this.parameters = new Map(info.params.map(param => [param.pythonName, param]));
    let body: EmittedBlock | undefined;
    try {
      body = link(this.statements(statement.body));
    } finally {
      this.parameters = new Map();
    }
    const prototype: EmittedBlock = {
      id: this.id(),
      type: 'procedures_prototype',
      extraState: mutationXml({
        proccode: info.proccode,
        argumentids: JSON.stringify(info.params.map(param => param.id)),
        argumentnames: JSON.stringify(info.params.map(param => param.displayName)),
        argumentdefaults: JSON.stringify(
          info.params.map(param => (param.kind === 'b' ? 'false' : '')),
        ),
        warp: 'false',
      }),
    };
    const definition: EmittedBlock = {
      id: this.id(),
      type: 'procedures_definition',
      x: 360,
      y: 48 + index * 200,
      inputs: { custom_block: { block: prototype } },
    };
    if (body) definition.next = { block: body };
    return definition;
  }

  private procedureCall(
    statement: Extract<Stmt, { kind: 'procCall' }>,
  ): EmittedBlock {
    const info = this.procedures.get(statement.name);
    if (!info) {
      throw new PythonDecompileError(
        statement.line,
        `自制积木 ${statement.name} 没有定义`,
      );
    }
    if (statement.args.length !== info.params.length) {
      throw new PythonDecompileError(
        statement.line,
        `${statement.name} 需要 ${info.params.length} 个参数`,
      );
    }
    const inputs: NonNullable<EmittedBlock['inputs']> = {};
    info.params.forEach((param, index) => {
      const arg = statement.args[index]!;
      inputs[param.id] =
        param.kind === 'b'
          ? { block: this.expression(arg, statement.line, 'boolean') }
          : this.value(arg, statement.line);
    });
    return {
      id: this.id(),
      type: 'procedures_call',
      extraState: mutationXml({
        proccode: info.proccode,
        argumentids: JSON.stringify(info.params.map(param => param.id)),
        warp: 'false',
      }),
      inputs,
    };
  }

  private argumentReporter(param: BoundParam): EmittedBlock {
    return {
      id: this.id(),
      type:
        param.kind === 'b'
          ? 'argument_reporter_boolean'
          : 'argument_reporter_string_number',
      fields: { VALUE: param.displayName },
    };
  }

  private assign(statement: Extract<Stmt, { kind: 'assign' }>): EmittedBlock {
    if (this.parameters.has(statement.name)) {
      throw new PythonDecompileError(statement.line, '不能给自制积木的参数赋值');
    }
    const variableId = this.ensureVariable(statement.name, false);
    return {
      id: this.id(),
      type:
        statement.op === '+=' ? 'data_changevariableby' : 'data_setvariableto',
      fields: { VARIABLE: { id: variableId } },
      inputs: { VALUE: this.value(statement.value, statement.line) },
    };
  }

  private listMethod(
    statement: Extract<Stmt, { kind: 'method' }>,
  ): EmittedBlock {
    const variableId = this.ensureVariable(statement.target, true);
    const line = statement.line;
    const field = { LIST: { id: variableId } };
    switch (statement.method) {
      case 'append':
        return this.requireArgs(statement, 1, {
          id: this.id(),
          type: 'data_addtolist',
          fields: field,
          inputs: { ITEM: this.value(statement.args[0]!, line) },
        });
      case 'remove_index':
        return this.requireArgs(statement, 1, {
          id: this.id(),
          type: 'data_deleteoflist',
          fields: field,
          inputs: { INDEX: this.value(statement.args[0]!, line) },
        });
      case 'remove_all':
        return this.requireArgs(statement, 0, {
          id: this.id(),
          type: 'data_deletealloflist',
          fields: field,
        });
      case 'insert':
        return this.requireArgs(statement, 2, {
          id: this.id(),
          type: 'data_insertatlist',
          fields: field,
          inputs: {
            INDEX: this.value(statement.args[0]!, line),
            ITEM: this.value(statement.args[1]!, line),
          },
        });
      case 'set':
        return this.requireArgs(statement, 2, {
          id: this.id(),
          type: 'data_replaceitemoflist',
          fields: field,
          inputs: {
            INDEX: this.value(statement.args[0]!, line),
            ITEM: this.value(statement.args[1]!, line),
          },
        });
      default:
        throw new PythonDecompileError(
          line,
          `不支持的列表方法 ${statement.target}.${statement.method}`,
        );
    }
  }

  private requireArgs(
    statement: Extract<Stmt, { kind: 'method' }>,
    count: number,
    block: EmittedBlock,
  ): EmittedBlock {
    if (statement.args.length !== count) {
      throw new PythonDecompileError(
        statement.line,
        `${statement.method} 需要 ${count} 个参数`,
      );
    }
    return block;
  }

  private call(statement: Extract<Stmt, { kind: 'call' }>): EmittedBlock {
    const { callee, args, line } = statement;
    const id = this.id();
    switch (callee) {
      case '_motor.run_power':
        return this.motor(id, BLOCK_TYPES.motor.runPower, line, args, [
          'PORTS',
          'POWER',
        ]);
      case '_motor.run_for_power_seconds':
        return this.motor(id, BLOCK_TYPES.motor.runForPowerSeconds, line, args, [
          'PORTS',
          'POWER',
          'SECONDS',
        ]);
      case '_motor.stop':
        return this.motor(id, BLOCK_TYPES.motor.stop, line, args, ['PORTS']);
      case '_motor.stop_module':
        return {
          id,
          type: BLOCK_TYPES.motor.stopModule,
          fields: { MODE: String(this.intArg(args[1], line, 0, 1)) },
          inputs: { PORTS: this.motorPort(args[0], line) },
        };
      case '_motor.pair':
        this.exact(args, 3, line, callee);
        return {
          id,
          type: BLOCK_TYPES.move.pair,
          fields: { DIRECTION: String(this.intArg(args[2], line, 0, 3)) },
          inputs: { PORTS: this.motorPortPair(args[0]!, args[1]!, line) },
        };
      case '_motor.mov_set_stop_module':
        this.exact(args, 1, line, callee);
        return {
          id,
          type: BLOCK_TYPES.move.moveSetStopModule,
          fields: { MODE: String(this.intArg(args[0], line, 0, 1)) },
        };
      case '_motor.mov_dir_power':
        return this.direction(id, BLOCK_TYPES.move.movDirPower, line, args, false);
      case '_motor.mov_dir_power_seconds':
        return this.direction(
          id,
          BLOCK_TYPES.move.movDirPowerSeconds,
          line,
          args,
          true,
        );
      case '_motor.mov_power':
        return this.differential(id, BLOCK_TYPES.move.movPower, line, args, false);
      case '_motor.mov_for_power_seconds':
        return this.differential(
          id,
          BLOCK_TYPES.move.movForPowerSeconds,
          line,
          args,
          true,
        );
      case '_motor.mov_stop':
        this.exact(args, 0, line, callee);
        return { id, type: BLOCK_TYPES.move.movStop };
      case '_motor.mov_find_line_init':
        this.exact(args, 0, line, callee);
        return { id, type: BLOCK_TYPES.move.movFindLineInit };
      case '_motor.mov_find_line_run':
        this.exact(args, 6, line, callee);
        return {
          id,
          type: BLOCK_TYPES.move.movFindLineRun,
          inputs: {
            LEFT_SENSOR: this.value(args[0]!, line),
            RIGHT_SENSOR: this.value(args[1]!, line),
            LEFT_POWER: this.value(args[2]!, line),
            RIGHT_POWER: this.value(args[3]!, line),
            KP: this.value(args[4]!, line),
            KD: this.value(args[5]!, line),
          },
        };
      case '_os.sleep_s':
        this.exact(args, 1, line, callee);
        return {
          id,
          type: BLOCK_TYPES.control.sleepS,
          inputs: { SECONDS: this.value(args[0]!, line) },
        };
      case '_os.stop_exit':
        this.exact(args, 0, line, callee);
        return { id, type: BLOCK_TYPES.control.stopExit };
      case '_beep.play_muic':
        this.exact(args, 2, line, callee);
        return {
          id,
          type: BLOCK_TYPES.sound.playMusic,
          inputs: {
            NOTE: this.note(args[0]!, line),
            DURATION: this.value(args[1]!, line),
          },
        };
      case '_color.set_color_threshold_value':
        return this.sensorCall(
          id,
          BLOCK_TYPES.sensor.gray_sensor.setColorThresholdValue,
          line,
          args,
          ['PORTS', 'VALUE'],
        );
      case '_color.one_calibrate':
        return this.sensorCall(
          id,
          BLOCK_TYPES.sensor.gray_sensor.oneCalibrate,
          line,
          args,
          ['PORTS', 'SECONDS'],
        );
      case '_color.two_calibrate':
        this.exact(args, 3, line, callee);
        return {
          id,
          type: BLOCK_TYPES.sensor.gray_sensor.twoCalibrate,
          inputs: {
            PORTS: this.portPair(args[0]!, args[1]!, line),
            SECONDS: this.value(args[2]!, line),
          },
        };
      case '_motor.mov_set_advance_offset':
        return this.offset(
          id,
          BLOCK_TYPES.sensor.remote_control_sensor.movSetAdvanceOffset,
          line,
          args,
        );
      case '_motor.mov_set_retreat_offset':
        return this.offset(
          id,
          BLOCK_TYPES.sensor.remote_control_sensor.movSetRetreatOffset,
          line,
          args,
        );
      case '_os.resetTimer':
        this.exact(args, 0, line, callee);
        return { id, type: BLOCK_TYPES.sensor.other.resetTimer };
      case '_matrix.clear':
        this.exact(args, 0, line, callee);
        return { id, type: BLOCK_TYPES.matrixLight.clear };
      case '_matrix.set_brightness':
        this.exact(args, 1, line, callee);
        return {
          id,
          type: BLOCK_TYPES.matrixLight.setBrightness,
          fields: { BRIGHTNESS: String(this.intArg(args[0], line, 0, 100)) },
        };
      case '_matrix.show':
        this.exact(args, 7, line, callee);
        return {
          id,
          type: BLOCK_TYPES.matrixLight.show,
          fields: {
            MATRIX: args
              .map(arg =>
                this.intArg(arg, line, 0, 0x1f).toString(16).toUpperCase().padStart(2, '0'),
              )
              .join(','),
          },
        };
      case '_matrix.show_roll':
        this.exact(args, 1, line, callee);
        return {
          id,
          type: BLOCK_TYPES.matrixLight.showRoll,
          inputs: { TEXT: this.rollText(args[0]!, line) },
        };
      case '_matrix.set_pixel_brightness':
        this.exact(args, 3, line, callee);
        return {
          id,
          type: BLOCK_TYPES.matrixLight.setPixelBrightness,
          fields: { OPEN: String(this.intArg(args[2], line, 0, 1)) },
          inputs: {
            X: this.value(args[0]!, line),
            Y: this.value(args[1]!, line),
          },
        };
      default:
        throw new PythonDecompileError(line, `不支持的调用 ${callee}`);
    }
  }

  private motor(
    id: string,
    type: string,
    line: number,
    args: Expr[],
    names: string[],
  ): EmittedBlock {
    this.exact(args, names.length, line, type);
    const inputs: EmittedBlock['inputs'] = {
      PORTS: this.motorPort(args[0], line),
    };
    names.slice(1).forEach((name, index) => {
      inputs[name] = this.value(args[index + 1]!, line);
    });
    return { id, type, inputs };
  }

  private sensorCall(
    id: string,
    type: string,
    line: number,
    args: Expr[],
    names: string[],
  ): EmittedBlock {
    this.exact(args, names.length, line, type);
    const inputs: EmittedBlock['inputs'] = {
      PORTS: this.sensorPort(args[0], line),
    };
    names.slice(1).forEach((name, index) => {
      inputs[name] = this.value(args[index + 1]!, line);
    });
    return { id, type, inputs };
  }

  private direction(
    id: string,
    type: string,
    line: number,
    args: Expr[],
    timed: boolean,
  ): EmittedBlock {
    this.exact(args, timed ? 3 : 2, line, type);
    const direction = this.stringArg(args[0], line);
    if (!DIRECTIONS.has(direction)) {
      throw new PythonDecompileError(line, `方向无效：${direction}`);
    }
    const inputs: EmittedBlock['inputs'] = {
      POWER: this.value(args[1]!, line),
    };
    if (timed) inputs.SECONDS = this.value(args[2]!, line);
    return { id, type, fields: { DIRECTION: direction }, inputs };
  }

  private differential(
    id: string,
    type: string,
    line: number,
    args: Expr[],
    timed: boolean,
  ): EmittedBlock {
    this.exact(args, timed ? 3 : 2, line, type);
    const inputs: EmittedBlock['inputs'] = {
      LEFT_POWER: this.value(args[0]!, line),
      RIGHT_POWER: this.value(args[1]!, line),
    };
    if (timed) inputs.SECONDS = this.value(args[2]!, line);
    return { id, type, inputs };
  }

  private offset(
    id: string,
    type: string,
    line: number,
    args: Expr[],
  ): EmittedBlock {
    this.exact(args, 2, line, type);
    return {
      id,
      type,
      inputs: {
        LEFT_OFFSET: this.value(args[0]!, line),
        RIGHT_OFFSET: this.value(args[1]!, line),
      },
    };
  }

  private value(
    expr: Expr,
    line: number,
    slot: ValueSlot = 'value',
  ): { block?: EmittedBlock; shadow?: EmittedBlock } {
    if (expr.kind === 'number') {
      if (slot === 'boolean') {
        throw new PythonDecompileError(line, '条件需要是否积木');
      }
      return { shadow: this.numberShadow(expr.value) };
    }
    return { block: this.expression(expr, line, slot) };
  }

  private expression(expr: Expr, line: number, slot: ValueSlot = 'value'): EmittedBlock {
    if (expr.kind === 'number') {
      if (slot === 'boolean') {
        throw new PythonDecompileError(line, '是否孔不能填数字');
      }
      return this.numberShadow(expr.value);
    }
    if (slot === 'boolean' && expr.kind === 'string') {
      throw new PythonDecompileError(line, '是否孔不能填文字');
    }
    if (expr.kind === 'string') {
      return {
        id: this.id(),
        type: 'text',
        fields: { TEXT: expr.value },
      };
    }
    if (expr.kind === 'bool') {
      throw new PythonDecompileError(line, '布尔字面量不能单独作为积木值');
    }
    if (expr.kind === 'name') {
      const param = this.parameters.get(expr.value);
      if (param) return this.parameterValue(param, line, slot);
      const variableId = this.variables.get(expr.value)?.id;
      if (!variableId) {
        throw new PythonDecompileError(line, `未定义的变量 ${expr.value}`);
      }
      const variable = this.variables.get(expr.value)!;
      const fieldName = variable.isList ? 'LIST' : 'VARIABLE';
      const variableType = variable.isList ? 'list' : '';
      return {
        id: this.id(),
        type: variable.isList ? 'data_listcontents' : 'data_variable',
        fields: {
          // field_variable_getter 的 JSON 状态是一段 XML，不是 { id }。
          [fieldName]: `<field name="${fieldName}" id="${escapeXml(variableId)}" variabletype="${variableType}">${escapeXml(variable.displayName)}</field>`,
        },
      };
    }
    if (expr.kind === 'unary' && expr.op === 'not') {
      return {
        id: this.id(),
        type: 'operator_not',
        inputs: { OPERAND: this.value(expr.inner, line, 'boolean') },
      };
    }
    if (expr.kind === 'unary' && expr.op === '-') {
      return {
        id: this.id(),
        type: 'operator_subtract',
        inputs: {
          NUM1: { shadow: this.numberShadow(0) },
          NUM2: this.value(expr.inner, line),
        },
      };
    }
    if (expr.kind === 'index') return this.indexExpression(expr, line);
    if (expr.kind === 'binary') return this.binary(expr, line);
    if (expr.kind === 'attrCall') return this.reporter(expr, line);
    if (expr.kind === 'call' && expr.callee === 'str') {
      this.exact(expr.args, 1, line, 'str');
      return this.expression(expr.args[0]!, line);
    }
    if (expr.kind === 'call' && expr.callee === 'len') {
      this.exact(expr.args, 1, line, 'len');
      return {
        id: this.id(),
        type: 'operator_length',
        inputs: { STRING: this.value(expr.args[0]!, line) },
      };
    }
    if (expr.kind === 'call' && this.procedures.has(expr.callee)) {
      throw new PythonDecompileError(line, '自制积木只能单独成一行，不能当作数值');
    }
    throw new PythonDecompileError(line, '不支持的表达式');
  }

  private unwrapStr(expr: Expr): Expr | null {
    if (expr.kind === 'call' && expr.callee === 'str' && expr.args.length === 1) {
      return expr.args[0]!;
    }
    return null;
  }

  private unwrapInt(expr: Expr): Expr | null {
    if (expr.kind === 'call' && expr.callee === 'int' && expr.args.length === 1) {
      return expr.args[0]!;
    }
    return null;
  }

  private indexExpression(
    expr: Extract<Expr, { kind: 'index' }>,
    line: number,
  ): EmittedBlock {
    const letter = this.letterOfExpression(expr, line);
    if (letter) return letter;
    if (expr.target.kind !== 'name') {
      throw new PythonDecompileError(line, '只支持列表名取某一项');
    }
    const variableId = this.ensureVariable(expr.target.value, true);
    return {
      id: this.id(),
      type: 'data_itemoflist',
      fields: { LIST: { id: variableId } },
      inputs: { INDEX: this.value(expr.index, line) },
    };
  }

  /** 对应手机：str(文字)[int(序号) - 1] → operator_letter_of */
  private letterOfExpression(
    expr: Extract<Expr, { kind: 'index' }>,
    line: number,
  ): EmittedBlock | null {
    const text = this.unwrapStr(expr.target);
    if (!text) return null;
    const index = expr.index;
    if (
      index.kind !== 'binary' ||
      index.op !== '-' ||
      index.right.kind !== 'number' ||
      index.right.value !== 1
    ) {
      return null;
    }
    const letter = this.unwrapInt(index.left);
    if (!letter) return null;
    return {
      id: this.id(),
      type: 'operator_letter_of',
      inputs: {
        LETTER: this.value(letter, line),
        STRING: this.value(text, line),
      },
    };
  }

  private binary(
    expr: Extract<Expr, { kind: 'binary' }>,
    line: number,
  ): EmittedBlock {
    if (expr.op === 'in') {
      const needle = this.unwrapStr(expr.left);
      const haystack = this.unwrapStr(expr.right);
      if (!needle || !haystack) {
        throw new PythonDecompileError(line, '包含判断需要 str(...) in str(...)');
      }
      return {
        id: this.id(),
        type: 'operator_contains',
        inputs: {
          STRING1: this.value(haystack, line),
          STRING2: this.value(needle, line),
        },
      };
    }
    if (expr.op === '+') {
      const left = this.unwrapStr(expr.left);
      const right = this.unwrapStr(expr.right);
      if (left && right) {
        return {
          id: this.id(),
          type: 'operator_join',
          inputs: {
            STRING1: this.value(left, line),
            STRING2: this.value(right, line),
          },
        };
      }
    }
    const types: Record<string, [string, string, string]> = {
      '+': ['operator_add', 'NUM1', 'NUM2'],
      '-': ['operator_subtract', 'NUM1', 'NUM2'],
      '*': ['operator_multiply', 'NUM1', 'NUM2'],
      '/': ['operator_divide', 'NUM1', 'NUM2'],
      '%': ['operator_mod', 'NUM1', 'NUM2'],
      '==': ['operator_equals', 'OPERAND1', 'OPERAND2'],
      '<': ['operator_lt', 'OPERAND1', 'OPERAND2'],
      '>': ['operator_gt', 'OPERAND1', 'OPERAND2'],
      and: ['operator_and', 'OPERAND1', 'OPERAND2'],
      or: ['operator_or', 'OPERAND1', 'OPERAND2'],
    };
    const mapped = types[expr.op];
    if (!mapped) {
      throw new PythonDecompileError(line, `不支持的运算符 ${expr.op}`);
    }
    const booleanOp = expr.op === 'and' || expr.op === 'or';
    const operandSlot: ValueSlot = booleanOp ? 'boolean' : 'value';
    const [type, left, right] = mapped;
    return {
      id: this.id(),
      type,
      inputs: {
        [left]: this.value(expr.left, line, operandSlot),
        [right]: this.value(expr.right, line, operandSlot),
      },
    };
  }

  private reporter(
    expr: Extract<Expr, { kind: 'attrCall' }>,
    line: number,
  ): EmittedBlock {
    const math = this.mathOrRandom(expr, line);
    if (math) return math;
    const callee = `${expr.target}.${expr.method}`;
    const id = this.id();
    switch (callee) {
      case '_touch.state':
        this.exact(expr.args, 1, line, callee);
        return {
          id,
          type: BLOCK_TYPES.sensor.touch_sensor.state,
          inputs: { PORTS: this.sensorPort(expr.args[0], line) },
        };
      case '_color.lux':
      case '_color.lux_state':
        this.exact(expr.args, 1, line, callee);
        return {
          id,
          type:
            expr.method === 'lux'
              ? BLOCK_TYPES.sensor.gray_sensor.lux
              : BLOCK_TYPES.sensor.gray_sensor.luxState,
          inputs: { PORTS: this.sensorPort(expr.args[0], line) },
        };
      case '_color.cmp_lux':
        return this.compareSensor(
          id,
          BLOCK_TYPES.sensor.gray_sensor.cmpLux,
          line,
          expr.args,
        );
      case '_ultrasion.value':
        this.exact(expr.args, 1, line, callee);
        return {
          id,
          type: BLOCK_TYPES.sensor.ultrasonic_sensor.value,
          inputs: { PORTS: this.sensorPort(expr.args[0], line) },
        };
      case '_ultrasion.cmp_value':
        return this.compareSensor(
          id,
          BLOCK_TYPES.sensor.ultrasonic_sensor.cmpValue,
          line,
          expr.args,
        );
      case '_key.key_remote': {
        this.exact(expr.args, 2, line, callee);
        const key = this.stringArg(expr.args[0], line);
        const state = this.stringArg(expr.args[1], line);
        if (!SHANK_KEYS.has(key) || (state !== 'press' && state !== 'unpress')) {
          throw new PythonDecompileError(line, '手柄按键或状态无效');
        }
        return {
          id,
          type: BLOCK_TYPES.sensor.remote_control_sensor.keyRemote,
          fields: { STATE: state },
          inputs: {
            HANDLESHANK: {
              shadow: {
                id: this.id(),
                type: BLOCK_TYPES.common.handleShankPicker,
                fields: { HANDLESHANK: key },
              },
            },
          },
        };
      }
      case '_key.key_mast': {
        this.exact(expr.args, 2, line, callee);
        const key = this.stringArg(expr.args[0], line);
        const state = this.intArg(expr.args[1], line, 0, 1);
        if (key !== 'left' && key !== 'right') {
          throw new PythonDecompileError(line, '主机按键无效');
        }
        return {
          id,
          type: BLOCK_TYPES.sensor.other.keyMast,
          fields: { KEY: key, STATE: String(state) },
        };
      }
      case '_os.timer':
        this.exact(expr.args, 0, line, callee);
        return { id, type: BLOCK_TYPES.sensor.other.timer };
      case '_key.read_adcance_left_offset':
        return this.offsetRead(
          id,
          BLOCK_TYPES.sensor.remote_control_sensor.readAdcanceLeftOffset,
          expr.args,
          line,
        );
      case '_key.read_advance_right_offset':
        return this.offsetRead(
          id,
          BLOCK_TYPES.sensor.remote_control_sensor.readAdvanceRightOffset,
          expr.args,
          line,
        );
      case '_key.read_retreat_left_offset':
        return this.offsetRead(
          id,
          BLOCK_TYPES.sensor.remote_control_sensor.readRetreatLeftOffset,
          expr.args,
          line,
        );
      case '_key.read_retreat_right_offset':
        return this.offsetRead(
          id,
          BLOCK_TYPES.sensor.remote_control_sensor.readRetreatRightOffset,
          expr.args,
          line,
        );
      default:
        if (!expr.target.startsWith('_')) {
          return this.listReporter(expr, line);
        }
        throw new PythonDecompileError(line, `不支持的表达式 ${callee}`);
    }
  }

  private listReporter(
    expr: Extract<Expr, { kind: 'attrCall' }>,
    line: number,
  ): EmittedBlock {
    const variableId = this.ensureVariable(expr.target, true);
    if (expr.method === 'num') {
      this.exact(expr.args, 0, line, 'num');
      return {
        id: this.id(),
        type: 'data_lengthoflist',
        fields: { LIST: { id: variableId } },
      };
    }
    if (expr.method === 'list_if_data') {
      this.exact(expr.args, 1, line, 'list_if_data');
      return {
        id: this.id(),
        type: 'data_listcontainsitem',
        fields: { LIST: { id: variableId } },
        inputs: { ITEM: this.value(expr.args[0]!, line) },
      };
    }
    if (expr.method === 'dataToindex') {
      this.exact(expr.args, 1, line, 'dataToindex');
      return {
        id: this.id(),
        type: 'data_itemnumoflist',
        fields: { LIST: { id: variableId } },
        inputs: { ITEM: this.value(expr.args[0]!, line) },
      };
    }
    throw new PythonDecompileError(
      line,
      `不支持的列表表达式 ${expr.target}.${expr.method}`,
    );
  }

  private mathOrRandom(
    expr: Extract<Expr, { kind: 'attrCall' }>,
    line: number,
  ): EmittedBlock | null {
    if (expr.target === '_random' && expr.method === 'randint') {
      this.exact(expr.args, 2, line, '_random.randint');
      return {
        id: this.id(),
        type: 'operator_random',
        inputs: {
          FROM: this.value(expr.args[0]!, line),
          TO: this.value(expr.args[1]!, line),
        },
      };
    }
    if (expr.target !== '_math') return null;
    const arg0 = expr.args[0];
    if (expr.method === 'round') {
      this.exact(expr.args, 1, line, '_math.round');
      return {
        id: this.id(),
        type: 'operator_round',
        inputs: { NUM: this.value(arg0!, line) },
      };
    }
    const simpleOps: Record<string, string> = {
      abs: 'abs',
      floor: 'floor',
      ceil: 'ceiling',
      sqrt: 'sqrt',
      log: 'ln',
      log10: 'log',
      exp: 'e ^',
    };
    if (simpleOps[expr.method]) {
      this.exact(expr.args, 1, line, `_math.${expr.method}`);
      return this.mathOp(simpleOps[expr.method]!, arg0!, line);
    }
    if (
      (expr.method === 'sin' ||
        expr.method === 'cos' ||
        expr.method === 'tan') &&
      arg0?.kind === 'attrCall' &&
      arg0.target === '_math' &&
      arg0.method === 'radians' &&
      arg0.args.length === 1
    ) {
      this.exact(expr.args, 1, line, `_math.${expr.method}`);
      return this.mathOp(expr.method, arg0.args[0]!, line);
    }
    if (
      expr.method === 'degrees' &&
      arg0?.kind === 'attrCall' &&
      arg0.target === '_math' &&
      (arg0.method === 'asin' ||
        arg0.method === 'acos' ||
        arg0.method === 'atan') &&
      arg0.args.length === 1
    ) {
      this.exact(expr.args, 1, line, '_math.degrees');
      return this.mathOp(arg0.method, arg0.args[0]!, line);
    }
    if (expr.method === 'pow') {
      this.exact(expr.args, 2, line, '_math.pow');
      if (arg0?.kind === 'number' && arg0.value === 10) {
        return this.mathOp('10 ^', expr.args[1]!, line);
      }
      throw new PythonDecompileError(line, '只支持 _math.pow(10, n)');
    }
    return null;
  }

  private mathOp(operator: string, num: Expr, line: number): EmittedBlock {
    return {
      id: this.id(),
      type: 'operator_mathop',
      fields: { OPERATOR: operator },
      inputs: { NUM: this.value(num, line) },
    };
  }

  private offsetRead(
    id: string,
    type: string,
    args: Expr[],
    line: number,
  ): EmittedBlock {
    this.exact(args, 0, line, type);
    return { id, type };
  }

  private compareSensor(
    id: string,
    type: string,
    line: number,
    args: Expr[],
  ): EmittedBlock {
    this.exact(args, 3, line, type);
    const cmp = this.stringArg(args[1], line);
    if (!['>', '<', '==', '!=', '>=', '<='].includes(cmp)) {
      throw new PythonDecompileError(line, `比较符无效：${cmp}`);
    }
    return {
      id,
      type,
      fields: { CMP: cmp },
      inputs: {
        PORTS: this.sensorPort(args[0], line),
        VALUE: this.value(args[2]!, line),
      },
    };
  }

  private rollText(
    expr: Expr,
    line: number,
  ): { block?: EmittedBlock; shadow?: EmittedBlock } {
    const inner =
      expr.kind === 'call' && expr.callee === 'str' ? expr.args[0] : expr;
    if (!inner) throw new PythonDecompileError(line, '滚动文字缺少内容');
    if (inner.kind === 'string') {
      return {
        shadow: {
          id: this.id(),
          type: 'text',
          fields: { TEXT: inner.value },
        },
      };
    }
    return this.value(inner, line);
  }

  private note(
    expr: Expr,
    line: number,
  ): { shadow: EmittedBlock } {
    const name = this.stringArg(expr, line);
    const pitch = notePitch.get(name);
    if (pitch === undefined) {
      throw new PythonDecompileError(line, `无法识别音名 ${name}`);
    }
    return {
      shadow: {
        id: this.id(),
        type: BLOCK_TYPES.common.notePicker,
        fields: { NOTE: String(pitch) },
      },
    };
  }

  private motorPort(
    expr: Expr | undefined,
    line: number,
  ): { shadow: EmittedBlock } {
    return this.port(expr, line, 4, 7, BLOCK_TYPES.common.motorPortDropdown);
  }

  private sensorPort(
    expr: Expr | undefined,
    line: number,
  ): { shadow: EmittedBlock } {
    return this.port(expr, line, 0, 3, BLOCK_TYPES.common.portDropdown);
  }

  private port(
    expr: Expr | undefined,
    line: number,
    min: number,
    max: number,
    type: string,
  ): { shadow: EmittedBlock } {
    const value = this.intArg(expr, line, min, max);
    return {
      shadow: {
        id: this.id(),
        type,
        fields: { PORT: String(value) },
      },
    };
  }

  private portPair(
    left: Expr,
    right: Expr,
    line: number,
  ): { shadow: EmittedBlock } {
    const a = this.intArg(left, line, 0, 3);
    const b = this.intArg(right, line, 0, 3);
    return {
      shadow: {
        id: this.id(),
        type: BLOCK_TYPES.common.portPairDropdown,
        fields: { PORT: `${a},${b}` },
      },
    };
  }

  private motorPortPair(
    left: Expr,
    right: Expr,
    line: number,
  ): { shadow: EmittedBlock } {
    const a = this.intArg(left, line, 4, 7);
    const b = this.intArg(right, line, 4, 7);
    return {
      shadow: {
        id: this.id(),
        type: BLOCK_TYPES.common.motorPortPairDropdown,
        fields: { PORT: `${a},${b}` },
      },
    };
  }

  private numberShadow(value: number): EmittedBlock {
    return {
      id: this.id(),
      type: Number.isInteger(value)
        ? BLOCK_TYPES.common.integerSlider
        : BLOCK_TYPES.common.positiveKeyboard,
      fields: { NUM: value },
    };
  }

  private intArg(
    expr: Expr | undefined,
    line: number,
    min: number,
    max: number,
  ): number {
    if (!expr || expr.kind !== 'number' || !Number.isInteger(expr.value)) {
      throw new PythonDecompileError(line, '需要整数');
    }
    if (expr.value < min || expr.value > max) {
      throw new PythonDecompileError(line, `整数超出范围 ${min}..${max}`);
    }
    return expr.value;
  }

  private stringArg(expr: Expr | undefined, line: number): string {
    if (!expr || expr.kind !== 'string') {
      throw new PythonDecompileError(line, '需要字符串字面量');
    }
    return expr.value;
  }

  private exact(args: Expr[], count: number, line: number, label: string): void {
    if (args.length !== count) {
      throw new PythonDecompileError(line, `${label} 需要 ${count} 个参数`);
    }
  }
}

function mutationXml(attributes: Record<string, string>): string {
  const parts = Object.entries(attributes).map(
    ([name, value]) => `${name}="${escapeXml(value)}"`,
  );
  return `<mutation ${parts.join(' ')}></mutation>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function link(blocks: EmittedBlock[]): EmittedBlock | undefined {
  for (let index = 0; index < blocks.length - 1; index += 1) {
    blocks[index]!.next = { block: blocks[index + 1]! };
  }
  return blocks[0];
}

export function pythonToWorkspace(
  source: string,
  prefix: string,
): PythonWorkspaceFragment {
  if (isEmptyAssistantPython(source)) {
    return { variables: [], procedures: [] };
  }
  const program = parsePythonProgram(source);
  if (!program.statements.some(statement => statement.kind !== 'global' && statement.kind !== 'listInit')) {
    throw new PythonDecompileError(1, '没有可转换的语句');
  }
  return new Emitter(prefix, program.displayNames).emit(program.statements);
}

const VARIABLE_MAPPING =
  /^#\s*@(?:var|list)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=>|=)\s*(.+?)\s*$/;
const CUSTOM_ARG_ALIGN =
  /^#\s*@(?:sparkai-custom-arg|custom-arg)\s+[A-Za-z_][A-Za-z0-9_]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=>|=)\s*(.+?)\s*$/;

/** 代码生成会把显示名转成拼音，比较前把源码里的标识符对齐到该结果。 */
function alignVariableIdentifiers(source: string): string {
  const names = new Map<string, string>();
  for (const raw of source.split(/\r?\n/)) {
    const trimmed = raw.trim();
    const variable = VARIABLE_MAPPING.exec(trimmed);
    if (variable) {
      const generated = displayNameToPythonIdentifier(variable[2]!);
      if (generated !== variable[1]) names.set(variable[1]!, generated);
      continue;
    }
    const customArg = CUSTOM_ARG_ALIGN.exec(trimmed);
    if (customArg) {
      const generated = displayNameToPythonIdentifier(customArg[2]!);
      if (generated !== customArg[1]) names.set(customArg[1]!, generated);
    }
  }
  if (names.size === 0) return source;
  let result = '';
  let quote: string | null = null;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (quote) {
      result += char;
      if (char === '\\') {
        result += source[index + 1] ?? '';
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
    if (/[A-Za-z_]/.test(char)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(index));
      const word = match?.[0] ?? char;
      result += names.get(word) ?? word;
      index += word.length - 1;
      continue;
    }
    result += char;
  }
  return result;
}

/**
 * 回环比较：先对齐显示名拼音，再走契约包规范化。
 * 不含 # @var / # @custom 元数据注释，避免注释原文差异导致误拒。
 */
export function isEmptyAssistantPython(source: string): boolean {
  return isEmptyAssistantPythonSource(alignVariableIdentifiers(source));
}

export function normalizeAssistantPython(source: string): string {
  return normalizeAssistantPythonSource(alignVariableIdentifiers(source), {
    includeMetadata: false,
  });
}
