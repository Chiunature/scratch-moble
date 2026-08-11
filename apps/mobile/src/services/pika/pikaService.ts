/**
 * PikaScript 原生适配层（react-native-pika 桥接）。
 *
 * 与域逻辑的分工：
 * - 本模块：只调原生（编译 / 运行 / 读文件），把结果解析为 PikaDiagnosticInput
 * - packages/core/runtime/pika：纯映射（文案 / 体积 / 预览 / magic 校验）
 *
 * 与 BLE 上传的分工：
 * - 本模块：Python 源码 → 本地 `pika-main.py.o`（手机私有目录，每次编译覆盖）
 * - upload/service：读取本地字节码 → 以 `{slot}.o` 文件名经 BLE 下发到主机
 */
import {
  compile,
  getDefaultBytecodePath,
  getPikaErrorName,
  isPikaSuccess,
  readFile,
  type PikaResult,
} from 'react-native-pika';

import { base64ToBytes } from '@scratch-mobile/protocol';

import {
  assertValidBytecode,
  decodeHexPayload,
  getBytecodeSize,
  hexPreview,
  isCompilablePythonSource,
  mapPikaMessage,
  mapPikaOutcomeBase,
  type PikaCompileOutcome,
  type PikaDiagnosticInput,
  type ResolvedPikaErrorName,
} from '@scratch-mobile/core';

function resolveErrorName(result: PikaResult): ResolvedPikaErrorName | undefined {
  if (isPikaSuccess(result)) {
    return undefined;
  }
  return result.errorName ?? getPikaErrorName(result.code) ?? 'UNKNOWN_ERROR';
}

function toDiagnosticInput(result: PikaResult): PikaDiagnosticInput {
  return {
    ok: isPikaSuccess(result),
    message: result.message,
    output: result.output,
    outputTruncated: result.outputTruncated === true,
    phase: result.phase,
    errorName: resolveErrorName(result),
  };
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
    ...mapPikaOutcomeBase(toDiagnosticInput(result)),
    bytecodePath: ok ? targetPath : null,
    bytecodeSize: getBytecodeSize(result.data, result.dataEncoding),
    hexPreview: ok ? hexPreview(result.data, result.dataEncoding) : '',
  };
}

/**
 * 读取本地编译产物为字节数组，供 BLE 上传使用。
 * 上传前校验 magic，避免将损坏或非 Pika 文件发到主机。
 */
export async function readBytecodeFile(path: string): Promise<number[]> {
  const result = await readFile(path);
  if (!isPikaSuccess(result)) {
    throw new Error(mapPikaMessage(toDiagnosticInput(result)) || '读取字节码失败');
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