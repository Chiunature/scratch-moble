/**
 * 代码生成的底层工具函数。
 * 这些函数只做数据提取和字符串格式化，不依赖任何积木业务逻辑，
 * 可以在 generators.ts 里自由组合使用。
 */
import type { GenerateContext, ScratchBlock } from './types';

export const INDENT_TEXT = '    ';

/*
接收了一个类型是GenerateContext的参数，然后在用context这个参数去接收他，
并使用context.indent来获取indent的值，然后返回一个字符串，字符串是indent_text重复context.indent次
 */
export function indent(context: GenerateContext): string {
  return INDENT_TEXT.repeat(context.indent); //对空格字符串进行重复的次数
}

/** 当前层的子层（循环体、函数体等）；继承 globalNames / procedureNames 等上下文。 */
export function childContext(context: GenerateContext): GenerateContext {
  return { ...context, indent: context.indent + 1 };
}

/** 在指定层级生成一行 Python（缩进 + 代码） */
export function line(context: GenerateContext, code: string): string {
  return `${indent(context)}${code}`;
}

/** 多行拼成一段代码，自动过滤空行 */
export function joinLines(...lines: string[]): string {
  return lines.filter(Boolean).join('\n');
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
  return (block.getInputTargetBlock?.(inputName) ??
    null) as ScratchBlock | null;
}

export function getFieldValue(
  block: ScratchBlock,
  fieldName: string,
): string | null {
  const value = block.getFieldValue?.(fieldName);
  return value == null ? null : String(value);
}

/**
 * VARIABLE / LIST 字段的 getFieldValue 返回 Blockly 内部 variable id，
 * 代码生成需要用户可见的变量名。
 */
export function getVariableFieldDisplayName(
  block: ScratchBlock,
  fieldName: string,
): string | null {
  type BlocklyField = { getText?: () => string };
  const displayName = (
    block as ScratchBlock & {
      getField?: (name: string) => BlocklyField | null;
    }
  )
    .getField?.(fieldName)
    ?.getText?.();
  if (displayName) {
    return displayName;
  }

  const variableId = getFieldValue(block, fieldName);
  if (!variableId) {
    return null;
  }

  const variable = block.workspace?.getVariableById?.(variableId);
  return variable?.getName?.() ?? variableId;
}
