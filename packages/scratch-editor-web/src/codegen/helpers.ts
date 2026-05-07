/**
 * 代码生成的底层工具函数。
 * 这些函数只做数据提取和字符串格式化，不依赖任何积木业务逻辑，
 * 可以在 generators.ts 里自由组合使用。
 */
import type { GenerateContext, ScratchBlock } from './types';

export const INDENT_TEXT = '    ';

export function indent(context: GenerateContext): string {
  return INDENT_TEXT.repeat(context.indent);
}

export function quotePythonString(value: string): string {
  return JSON.stringify(value);
}

export function getNextBlock(block: ScratchBlock): ScratchBlock | null {
  return (block.getNextBlock?.() ?? null) as ScratchBlock | null;
}

export function getInputTargetBlock(
  block: ScratchBlock,
  inputName: string,
): ScratchBlock | null {
  return (block.getInputTargetBlock?.(inputName) ?? null) as ScratchBlock | null;
}

export function getFieldValue(block: ScratchBlock, fieldName: string): string | null {
  const value = block.getFieldValue?.(fieldName);
  return value == null ? null : String(value);
}
