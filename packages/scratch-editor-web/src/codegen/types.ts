/**
 * 代码生成器共用的类型定义。
 * Workspace / ScratchBlock 从 ScratchBlocks 的返回值中推断，
 * 避免直接依赖未导出的内部类型。
 */
import * as ScratchBlocks from 'scratch-blocks';

export type Workspace = ReturnType<typeof ScratchBlocks.inject>;
export type ScratchBlock = ReturnType<Workspace['getTopBlocks']>[number];

export type ProcedureArgumentInfo = {
  displayNames: string[];
  paramNames: string[];
};

export type GenerateContext = {
  indent: number;
  /** 工作区变量对应的 Python 标识符，用于函数体内 global 声明 */
  globalNames?: string[];
  /** procCode → 去重后的 Python 函数名 */
  procedureNames?: Map<string, string>;
  /** procCode → 参数显示名与 Python 形参名 */
  procedureArguments?: Map<string, ProcedureArgumentInfo>;
  /** 正在生成的自制积木 procCode（函数体内解析 argument reporter） */
  currentProcedureProcCode?: string;
};

//定义了一个函数类型，接收积木块代码和空格缩进，然后返回对应代码字符串
export type StatementGenerator = (
  block: ScratchBlock,
  context: GenerateContext,
) => string;
