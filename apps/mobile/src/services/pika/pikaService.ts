/**
 * PikaScript 业务封装（编译 / 本地运行 / 读取字节码）。
 *
 * 与 BLE 上传的分工：
 * - 本模块：Python 源码 → 本地 `pika-main.py.o`（手机私有目录，每次编译覆盖）
 * - upload/service：读取本地字节码 → 以 `{slot}.o` 文件名经 BLE 下发到主机
 */
import {
  compile,
  execute,
  executeBytecode,
  getDefaultBytecodePath,
  getPikaErrorName,
  isPikaSuccess,
  readFile,
  type PikaErrorName,
  type PikaPhase,
  type PikaResult,
} from 'react-native-pika';

import { base64ToBytes } from '@scratch-mobile/protocol';

/** PikaScript 字节码 magic：0x0f + "pyo"，合法 .py.o 文件必须以这 4 字节开头 */
const PIKA_BYTECODE_MAGIC = [0x0f, 0x70, 0x79, 0x6f] as const;

/** 编辑器占位文案，不可作为有效 Python 编译 */
const NON_COMPILABLE_SOURCE_PREFIXES = [
  '//',
  '# 拖拽飞出栏积木后生成 Python 代码',
  '# 请从「当程序启动时」积木开始搭建程序',
] as const;

type ResolvedPikaErrorName = PikaErrorName | 'UNKNOWN_ERROR';

type PikaOutcomeBase = {
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

function decodeHexPayload(hex: string): Uint8Array {
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

function getBytecodeSize(result: PikaResult): number {
  if (!result.data) {
    return 0;
  }
  if (result.dataEncoding === 'hex') {
    return decodeHexPayload(result.data).length;
  }
  return result.data.length;
}

function hexPreview(result: PikaResult, maxBytes = 16): string {
  if (!result.data) {
    return '';
  }
  if (result.dataEncoding === 'hex') {
    return result.data.slice(0, maxBytes * 2);
  }
  const bytes = Uint8Array.from(result.data, char => char.charCodeAt(0));
  return Array.from(bytes.slice(0, maxBytes))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function resolveErrorName(result: PikaResult): ResolvedPikaErrorName | undefined {
  if (isPikaSuccess(result)) {
    return undefined;
  }
  return result.errorName ?? getPikaErrorName(result.code) ?? 'UNKNOWN_ERROR';
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
function mapPikaMessage(result: PikaResult): string {
  const output = result.output?.trim() ?? '';

  if (isPikaSuccess(result)) {
    if (output) {
      return result.outputTruncated ? `${output}\n（输出过长，已截断）` : output;
    }
    return result.message || 'ok';
  }

  const errorName = resolveErrorName(result) ?? 'UNKNOWN_ERROR';
  const label = humanizeErrorName(errorName);
  const phaseLabel = result.phase ? humanizePhase(result.phase) : undefined;
  const nativeMessage = result.message?.trim() ?? '';

  const parts = [
    phaseLabel ? `${label}（发生在${phaseLabel}）` : label,
  ];

  if (nativeMessage && !isGenericNativeMessage(nativeMessage)) {
    parts.push(nativeMessage);
  }

  const snippet = extractDiagnosticSnippet(output, nativeMessage);
  if (snippet && snippet !== nativeMessage) {
    parts.push('', '出错附近：', snippet);
  }

  if (result.outputTruncated) {
    parts.push('（输出过长，已截断）');
  }

  return parts.join('\n');
}

function mapPikaOutcomeBase(result: PikaResult): PikaOutcomeBase {
  return {
    ok: isPikaSuccess(result),
    message: mapPikaMessage(result),
    errorName: resolveErrorName(result),
    phase: result.phase,
    output: result.output,
    outputTruncated: result.outputTruncated === true,
  };
}

function isCompilablePythonSource(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed) {
    return false;
  }
  return !NON_COMPILABLE_SOURCE_PREFIXES.some(prefix =>
    trimmed.startsWith(prefix),
  );
}

function assertValidBytecode(bytes: number[]): void {
  if (bytes.length === 0) {
    throw new Error('字节码文件为空');
  }

  const magicOk = PIKA_BYTECODE_MAGIC.every((byte, index) => bytes[index] === byte);
  if (!magicOk) {
    throw new Error('字节码格式无效，请重新编译');
  }
}

/** 将编辑器生成的 Python 编译为本地字节码文件 */
export async function compileGeneratedCode(
  source: string,
  outputPath?: string,
): Promise<PikaCompileOutcome> {
  const trimmed = source.trim();
  if (!isCompilablePythonSource(trimmed)) {
    return {
      ok: false,
      message: '暂无有效 Python 代码',
      bytecodePath: null,
      bytecodeSize: 0,
      hexPreview: '',
    };
  }

  const targetPath = outputPath ?? (await getDefaultBytecodePath());
  const result = await compile(trimmed, targetPath);
  const ok = isPikaSuccess(result);

  return {
    ...mapPikaOutcomeBase(result),
    bytecodePath: ok ? targetPath : null,
    bytecodeSize: getBytecodeSize(result),
    hexPreview: ok ? hexPreview(result) : '',
  };
}

export async function runGeneratedCode(source: string): Promise<PikaRunOutcome> {
  const trimmed = source.trim();
  if (!isCompilablePythonSource(trimmed)) {
    return { ok: false, message: '暂无有效 Python 代码' };
  }

  return mapPikaOutcomeBase(await execute(trimmed));
}

export async function runCompiledBytecode(
  bytecodePath: string,
): Promise<PikaRunOutcome> {
  if (!bytecodePath) {
    return { ok: false, message: '请先编译生成字节码' };
  }

  return mapPikaOutcomeBase(await executeBytecode(bytecodePath));
}

/**
 * 读取本地编译产物为字节数组，供 BLE 上传使用。
 * 上传前校验 magic，避免将损坏或非 Pika 文件发到主机。
 */
export async function readBytecodeFile(path: string): Promise<number[]> {
  const result = await readFile(path);
  if (!isPikaSuccess(result)) {
    throw new Error(mapPikaMessage(result) || '读取字节码失败');
  }
  if (!result.data) {
    throw new Error('字节码文件为空');
  }

  let bytes: number[];
  if (result.dataEncoding === 'hex') {
    bytes = Array.from(decodeHexPayload(result.data));
  } else if (result.dataEncoding === 'base64') {
    bytes = Array.from(base64ToBytes(result.data));
  } else {
    bytes = Array.from(result.data, char => char.charCodeAt(0));
  }

  assertValidBytecode(bytes);
  return bytes;
}

export { getDefaultBytecodePath };
