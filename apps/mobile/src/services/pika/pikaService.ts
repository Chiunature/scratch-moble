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
  readFile,
  type PikaResult,
} from 'react-native-pika';

import { base64ToBytes } from '../../utils/bleProtocol';

const PIKA_OK = 0;

/** PikaScript 字节码 magic：0x0f + "pyo"，合法 .py.o 文件必须以这 4 字节开头 */
const PIKA_BYTECODE_MAGIC = [0x0f, 0x70, 0x79, 0x6f] as const;

/** 编辑器占位文案，不可作为有效 Python 编译 */
const NON_COMPILABLE_SOURCE_PREFIXES = [
  '//',
  '# 拖拽飞出栏积木后生成 Python 代码',
  '# 请从「当程序启动时」积木开始搭建程序',
] as const;

export type PikaCompileOutcome = {
  ok: boolean;
  message: string;
  bytecodePath: string | null;
  bytecodeSize: number;
  hexPreview: string;
};

export type PikaRunOutcome = {
  ok: boolean;
  message: string;
};

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

function mapPikaMessage(result: PikaResult): string {
  if (result.code === PIKA_OK) {
    return result.message || 'ok';
  }
  return result.message || `PikaScript 错误 (${result.code})`;
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
  const bytecodePath = targetPath;
  const size = getBytecodeSize(result);

  return {
    ok: result.code === PIKA_OK,
    message: mapPikaMessage(result),
    bytecodePath: result.code === PIKA_OK ? bytecodePath : null,
    bytecodeSize: size,
    hexPreview: result.code === PIKA_OK ? hexPreview(result) : '',
  };
}

export async function runGeneratedCode(source: string): Promise<PikaRunOutcome> {
  const trimmed = source.trim();
  if (!isCompilablePythonSource(trimmed)) {
    return { ok: false, message: '暂无有效 Python 代码' };
  }

  const result = await execute(trimmed);
  return {
    ok: result.code === PIKA_OK,
    message: mapPikaMessage(result),
  };
}

export async function runCompiledBytecode(
  bytecodePath: string,
): Promise<PikaRunOutcome> {
  if (!bytecodePath) {
    return { ok: false, message: '请先编译生成字节码' };
  }

  const result = await executeBytecode(bytecodePath);
  return {
    ok: result.code === PIKA_OK,
    message: mapPikaMessage(result),
  };
}

/**
 * 读取本地编译产物为字节数组，供 BLE 上传使用。
 * 上传前校验 magic，避免将损坏或非 Pika 文件发到主机。
 */
export async function readBytecodeFile(path: string): Promise<number[]> {
  const result = await readFile(path);
  if (result.code !== PIKA_OK) {
    throw new Error(result.message || '读取字节码失败');
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
