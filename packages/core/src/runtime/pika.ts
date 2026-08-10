/**
 * PikaScript 纯域逻辑（无 RN 依赖，可单测）。
 *
 * 原生调用（react-native-pika）由 apps/mobile 的薄适配层完成：
 * 适配层把原生结果解析为 PikaDiagnosticInput（ok / errorName 已解析），
 * 本模块负责映射为可读文案、校验字节码、计算体积与预览。
 */

/** PikaScript 字节码 magic：0x0f + "pyo"，合法 .py.o 文件必须以这 4 字节开头 */
export const PIKA_BYTECODE_MAGIC = [0x0f, 0x70, 0x79, 0x6f] as const;

/** 编辑器占位文案，不可作为有效 Python 编译 */
export const NON_COMPILABLE_SOURCE_PREFIXES = [
  '//',
  '# 拖拽飞出栏积木后生成 Python 代码',
  '# 请从「当程序启动时」积木开始搭建程序',
] as const;

export type PikaPhase = 'compile' | 'execute' | 'bytecode' | 'io';

export type PikaErrorName =
  | 'SYNTAX_ERROR'
  | 'INDEX_ERROR'
  | 'RUNTIME_ERROR'
  | 'ASSERT_ERROR'
  | 'IO_ERROR'
  | 'IO_OPERATION_ERROR'
  | 'OUT_OF_RANGE'
  | 'INVALID_PARAM'
  | 'INSUFFICIENT_RESOURCE'
  | 'OPERATION_FAILED'
  | 'ARG_NOT_FOUND'
  | 'UNKNOWN_INSTRUCTION'
  | 'INVALID_POINTER'
  | 'UNALIGNED_POINTER'
  | 'INVALID_VERSION'
  | 'ILLEGAL_MAGIC_CODE'
  | 'SIGNAL_QUEUE_FULL'
  | 'SIGNAL_QUEUE_EMPTY';

export type ResolvedPikaErrorName = PikaErrorName | 'UNKNOWN_ERROR';

export type PikaOutcomeBase = {
  ok: boolean;
  message: string;
  errorName?: string;
  phase?: PikaPhase;
  output?: string;
  outputTruncated?: boolean;
};

export type PikaCompileOutcome = PikaOutcomeBase & {
  bytecodePath: string | null;
  bytecodeSize: number;
  hexPreview: string;
};

export type PikaRunOutcome = PikaOutcomeBase;

/** 原生结果的结构化输入；ok / errorName 由适配层（react-native-pika）解析 */
export type PikaDiagnosticInput = {
  ok: boolean;
  message?: string;
  output?: string;
  outputTruncated?: boolean;
  phase?: PikaPhase;
  errorName?: ResolvedPikaErrorName;
};

export function decodeHexPayload(hex: string): Uint8Array {
  const normalized = hex.trim();
  if (normalized.length === 0 || normalized.length % 2 !== 0) {
    return new Uint8Array(0);
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

export function getBytecodeSize(
  data: string | undefined,
  dataEncoding: string | undefined,
): number {
  if (!data) {
    return 0;
  }
  if (dataEncoding === 'hex') {
    return decodeHexPayload(data).length;
  }
  return data.length;
}

export function hexPreview(
  data: string | undefined,
  dataEncoding: string | undefined,
  maxBytes = 16,
): string {
  if (!data) {
    return '';
  }
  if (dataEncoding === 'hex') {
    return data.slice(0, maxBytes * 2);
  }
  const bytes = Uint8Array.from(data, char => char.charCodeAt(0));
  return Array.from(bytes.slice(0, maxBytes))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function humanizeErrorName(errorName: ResolvedPikaErrorName): string {
  switch (errorName) {
    case 'SYNTAX_ERROR':
      return '语法错误';
    case 'INDEX_ERROR':
      return '索引越界';
    case 'RUNTIME_ERROR':
      return '运行错误';
    case 'ASSERT_ERROR':
      return '断言失败';
    case 'IO_ERROR':
    case 'IO_OPERATION_ERROR':
      return '文件读写错误';
    case 'OUT_OF_RANGE':
      return '数值超出范围';
    case 'INVALID_PARAM':
      return '参数无效';
    case 'INSUFFICIENT_RESOURCE':
      return '资源不足';
    case 'OPERATION_FAILED':
      return '操作失败';
    case 'ARG_NOT_FOUND':
      return '缺少参数';
    case 'UNKNOWN_INSTRUCTION':
      return '未知指令';
    case 'INVALID_POINTER':
    case 'UNALIGNED_POINTER':
      return '内部指针错误';
    case 'INVALID_VERSION':
      return '版本不兼容';
    case 'ILLEGAL_MAGIC_CODE':
      return '字节码格式无效';
    case 'SIGNAL_QUEUE_FULL':
    case 'SIGNAL_QUEUE_EMPTY':
      return '信号队列异常';
    case 'UNKNOWN_ERROR':
      return '未知错误';
    default: {
      const _exhaustive: never = errorName;
      return _exhaustive;
    }
  }
}

function humanizePhase(phase: PikaPhase): string {
  switch (phase) {
    case 'compile':
      return '编译';
    case 'execute':
      return '运行';
    case 'bytecode':
      return '执行字节码';
    case 'io':
      return '读写文件';
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function isGenericNativeMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === 'error' ||
    normalized === 'ok' ||
    /^error:\s*syntax error\.?$/.test(normalized)
  );
}

/** 去掉与标题重复的尾巴，保留虚线框里的出错代码 */
function extractDiagnosticSnippet(output: string, nativeMessage: string): string {
  let text = output.trim();
  if (!text) {
    return '';
  }

  if (nativeMessage && text.endsWith(nativeMessage)) {
    text = text.slice(0, -nativeMessage.length).trim();
  }

  // 形如 ----\n[4]\ncode\n---- ，抽出中间代码更易读
  const boxed = text.match(/^-{3,}\n([\s\S]*?)\n-{3,}$/);
  if (boxed?.[1]) {
    return boxed[1].trim();
  }

  return text;
}

/**
 * 成功：优先展示 print/诊断 output，否则用 message。
 * 失败：中文摘要 + 出错代码片段，避免抛一堆英文错误码。
 */
export function mapPikaMessage(input: PikaDiagnosticInput): string {
  const output = input.output?.trim() ?? '';

  if (input.ok) {
    if (output) {
      return input.outputTruncated ? `${output}\n（输出过长，已截断）` : output;
    }
    return input.message || 'ok';
  }

  const errorName = input.errorName ?? 'UNKNOWN_ERROR';
  const label = humanizeErrorName(errorName);
  const phaseLabel = input.phase ? humanizePhase(input.phase) : undefined;
  const nativeMessage = input.message?.trim() ?? '';

  const parts = [phaseLabel ? `${label}（发生在${phaseLabel}）` : label];

  if (nativeMessage && !isGenericNativeMessage(nativeMessage)) {
    parts.push(nativeMessage);
  }

  const snippet = extractDiagnosticSnippet(output, nativeMessage);
  if (snippet && snippet !== nativeMessage) {
    parts.push('', '出错附近：', snippet);
  }

  if (input.outputTruncated) {
    parts.push('（输出过长，已截断）');
  }

  return parts.join('\n');
}

export function mapPikaOutcomeBase(input: PikaDiagnosticInput): PikaOutcomeBase {
  return {
    ok: input.ok,
    message: mapPikaMessage(input),
    errorName: input.errorName,
    phase: input.phase,
    output: input.output,
    outputTruncated: input.outputTruncated === true,
  };
}

export function isCompilablePythonSource(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed) {
    return false;
  }
  return !NON_COMPILABLE_SOURCE_PREFIXES.some(prefix =>
    trimmed.startsWith(prefix),
  );
}

export function assertValidBytecode(bytes: number[]): void {
  if (bytes.length === 0) {
    throw new Error('字节码文件为空');
  }

  const magicOk = PIKA_BYTECODE_MAGIC.every(
    (byte, index) => bytes[index] === byte,
  );
  if (!magicOk) {
    throw new Error('字节码格式无效，请重新编译');
  }
}