import { wrapScratchBlockInit } from './blockInitPatch';

/** 变量圆形报告积木：输出 check 设为 null，可插入任意值类型槽 */
export function patchDataVariableReporterOutput(): void {
  wrapScratchBlockInit('data_variable', block => {
    block.outputConnection?.setCheck(null);
  });
}
