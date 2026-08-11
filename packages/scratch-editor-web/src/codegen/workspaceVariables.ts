import { displayNameToPythonIdentifier } from './pythonIdentifier';
import { line } from './helpers';
import type { GenerateContext, Workspace } from './types';

const LIST_VARIABLE_TYPE = 'list';
const BROADCAST_MESSAGE_VARIABLE_TYPE = 'broadcast_msg';

type WorkspaceVariable = {
  displayName: string;
  pythonName: string;
  isList: boolean;
};

function compareVariableNames(a: WorkspaceVariable, b: WorkspaceVariable): number {
  return a.pythonName.localeCompare(b.pythonName);
}

/** 收集工作区中的标量变量与列表变量（不含广播消息）。 */
export function collectWorkspaceVariables(
  workspace: Workspace,
): WorkspaceVariable[] {
  type VariableModel = {
    getName?: () => string;
    getType?: () => string;
  };
  type WorkspaceWithVariables = Workspace & {
    getAllVariables?: () => VariableModel[];
    getVariableMap?: () => { getAllVariables?: () => VariableModel[] };
  };

  const ws = workspace as WorkspaceWithVariables;
  // getVariableMap 优先：blockly v12 已弃用 Workspace.getAllVariables，调用即告警
  const models =
    ws.getVariableMap?.()?.getAllVariables?.() ??
    ws.getAllVariables?.() ??
    [];

  return models
    .map(model => {
      const displayName = model.getName?.() ?? '';
      const type = model.getType?.() ?? '';
      if (!displayName || type === BROADCAST_MESSAGE_VARIABLE_TYPE) {
        return null;
      }
      return {
        displayName,
        pythonName: displayNameToPythonIdentifier(displayName),
        isList: type === LIST_VARIABLE_TYPE,
      };
    })
    .filter((item): item is WorkspaceVariable => item != null)
    .sort(compareVariableNames);
}

export function buildGlobalNames(variables: WorkspaceVariable[]): string[] {
  return variables.map(variable => variable.pythonName);
}

/** 顶层变量初始化：标量 = 0，列表 = PikaStdData.List() */
export function renderVariableInitializers(
  variables: WorkspaceVariable[],
): string[] {
  return variables.map(variable =>
    variable.isList
      ? `${variable.pythonName} = PikaStdData.List()`
      : `${variable.pythonName} = 0`,
  );
}

export function renderGlobalDeclaration(names: string[]): string | null {
  if (names.length === 0) {
    return null;
  }
  return `global ${names.join(', ')}`;
}

/** 在函数体开头插入 global 声明（若工作区存在变量）。 */
export function prependGlobalDeclaration(
  body: string,
  context: GenerateContext,
): string {
  const globalLine = renderGlobalDeclaration(context.globalNames ?? []);
  if (!globalLine) {
    return body;
  }
  const lines = [line(context, globalLine)];
  if (body) {
    lines.push(body);
  }
  return lines.join('\n');
}
