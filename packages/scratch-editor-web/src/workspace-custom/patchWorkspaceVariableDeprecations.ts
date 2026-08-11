import * as ScratchBlocks from 'scratch-blocks';

/**
 * blockly v12 将 Workspace.getAllVariables / getVariablesOfType 标记为弃用，
 * 内部 shim 每次调用都会 console.warn。项目自身已改用 getVariableMap()，
 * 但 scratch-blocks 内置代码（data_category、scratch_field_variable 等）仍走
 * Workspace 实例方法，导致每次渲染变量飞栏都告警。这里在原型上直接绕过
 * 弃用 shim，行为与原实现完全一致（都委托给 this.variableMap）。
 *
 * 须在 ScratchBlocks.inject() 之前调用（早于任何 Workspace 实例创建）。
 */
export function patchWorkspaceVariableDeprecations(): void {
  const proto = ScratchBlocks.Workspace.prototype as {
    getAllVariables?: () => unknown[];
    getVariablesOfType?: (type?: string) => unknown[];
  };
  if (typeof proto.getAllVariables === 'function') {
    proto.getAllVariables = function (this: { variableMap?: { getAllVariables?: () => unknown[] } }) {
      return this.variableMap?.getAllVariables?.() ?? [];
    };
  }
  if (typeof proto.getVariablesOfType === 'function') {
    proto.getVariablesOfType = function (
      this: { variableMap?: { getVariablesOfType?: (type: string) => unknown[] } },
      type?: string,
    ) {
      return this.variableMap?.getVariablesOfType?.(type ?? '') ?? [];
    };
  }
}