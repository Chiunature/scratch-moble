/**
 * 代码生成器共用的类型定义。
 * Workspace / ScratchBlock 从 ScratchBlocks 的返回值中推断，
 * 避免直接依赖未导出的内部类型。
 */
import * as ScratchBlocks from 'scratch-blocks';

export type Workspace = ReturnType<typeof ScratchBlocks.inject>;
export type ScratchBlock = ReturnType<Workspace['getTopBlocks']>[number];

export type GenerateContext = {
  indent: number;
};

//定义了一个函数类型，接收积木块代码和空格缩进，然后返回对应代码字符串
export type StatementGenerator = (
  block: ScratchBlock,
  context: GenerateContext,
) => string;
