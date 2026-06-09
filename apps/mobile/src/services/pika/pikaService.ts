import {
  compile,
  execute,
  executeBytecode,
  getDefaultBytecodePath,
  type PikaResult,
} from 'react-native-pika';

const PIKA_OK = 0;

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

export async function compileGeneratedCode(
  source: string,
  outputPath?: string,
): Promise<PikaCompileOutcome> {
  const trimmed = source.trim();
  if (!trimmed || trimmed.startsWith('//')) {
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
  if (!trimmed || trimmed.startsWith('//')) {
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
