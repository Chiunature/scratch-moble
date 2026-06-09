import { getActiveGenerateContext } from './codegenScope';
import { getFieldValue, getInputTargetBlock } from './helpers';
import { displayNameToPythonIdentifier } from './pythonIdentifier';
import type { ProcedureArgumentInfo, ScratchBlock } from './types';

type BlockWithProcCode = ScratchBlock & { getProcCode?: () => string };
type ProcedureProtoBlock = ScratchBlock & {
  getProcCode?: () => string;
  displayNames_?: string[];
};

function procCodeLabel(procCode: string): string {
  return procCode.split(/(?=[^\\]%[nbs])/)[0]?.trim() ?? '';
}

export function procCodeToPythonBase(procCode: string): string {
  const label = procCodeLabel(procCode);
  if (label) {
    const fromLabel = displayNameToPythonIdentifier(label);
    if (fromLabel !== 'unnamed_var') {
      return fromLabel;
    }
  }

  const base = procCode
    .replace(/%[nsb]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return base && /^[A-Za-z_]/.test(base) ? base : `proc_${base || 'block'}`;
}

function getProcCodeFromBlock(block: ScratchBlock): string {
  return (block as BlockWithProcCode).getProcCode?.() ?? '';
}

/** 按工作区自制积木定义顺序，为 procCode 分配唯一 Python 函数名。 */
export function buildProcedureNameRegistry(
  procedureDefinitions: ScratchBlock[],
): Map<string, string> {
  const entries = procedureDefinitions.map(def => {
    const proto = getInputTargetBlock(def, 'custom_block');
    const procCode = proto ? getProcCodeFromBlock(proto) : '';
    return { procCode, base: procCodeToPythonBase(procCode) };
  });

  const baseCount = new Map<string, number>();
  for (const { base } of entries) {
    baseCount.set(base, (baseCount.get(base) ?? 0) + 1);
  }

  const baseIndex = new Map<string, number>();
  const registry = new Map<string, string>();

  for (const { procCode, base } of entries) {
    const index = baseIndex.get(base) ?? 0;
    baseIndex.set(base, index + 1);

    const hasDuplicateBase = (baseCount.get(base) ?? 0) > 1;
    const pythonName = hasDuplicateBase
      ? `${base}${String(index + 1).padStart(2, '0')}`
      : base;

    registry.set(procCode, pythonName);
  }

  return registry;
}

export function resolveProcedurePythonName(
  procCode: string,
  registry?: Map<string, string>,
): string {
  return registry?.get(procCode) ?? procCodeToPythonBase(procCode);
}

/**
 * 从 procCode 解析参数名，与主机约定一致：按参数顺序 number0 / boolean1 / string2 …
 * （类型前缀 + 在 procCode 中的全局序号）。
 */
export function procedureParamNamesFromProcCode(procCode: string): string[] {
  const components = procCode.split(/(?=[^\\]%[nbs])/).map(part => part.trim());
  const names: string[] = [];
  let argIndex = 0;

  for (const component of components) {
    if (!component.startsWith('%')) {
      continue;
    }
    const typeChar = component.charAt(1);
    switch (typeChar) {
      case 'n':
        names.push(`number${argIndex}`);
        break;
      case 'b':
        names.push(`boolean${argIndex}`);
        break;
      case 's':
        names.push(`string${argIndex}`);
        break;
      default:
        continue;
    }
    argIndex += 1;
  }

  return names;
}

function getDisplayNamesFromProto(proto: ProcedureProtoBlock): string[] {
  if (proto.displayNames_?.length) {
    return proto.displayNames_;
  }

  const mutation = (
    proto as ProcedureProtoBlock & { mutationToDom?: () => Element }
  ).mutationToDom?.();
  const raw = mutation?.getAttribute('argumentnames');
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** 优先使用用户在自制积木编辑器里命名的参数名，再转成合法 Python 标识符。 */
export function procedureParamNamesFromProto(proto: ProcedureProtoBlock): string[] {
  const procCode = getProcCodeFromBlock(proto);
  const fallbackNames = procedureParamNamesFromProcCode(procCode);
  const displayNames = getDisplayNamesFromProto(proto);
  const argCount = fallbackNames.length;

  if (argCount === 0) {
    return [];
  }

  const used = new Set<string>();
  const names: string[] = [];

  for (let index = 0; index < argCount; index += 1) {
    const trimmed = (displayNames[index] ?? '').trim();
    let name = trimmed
      ? displayNameToPythonIdentifier(trimmed)
      : (fallbackNames[index] ?? `arg${index}`);
    if (name === 'unnamed_var') {
      name = fallbackNames[index] ?? `arg${index}`;
    }

    let unique = name;
    let suffix = 1;
    while (used.has(unique)) {
      unique = `${name}${String(suffix).padStart(2, '0')}`;
      suffix += 1;
    }
    used.add(unique);
    names.push(unique);
  }

  return names;
}

function resolveParamFromArgumentInfo(
  info: ProcedureArgumentInfo,
  displayName: string,
): string | null {
  const normalized = displayName.trim();
  const index = info.displayNames.findIndex(
    name => name.trim() === normalized,
  );
  if (index === -1) {
    return null;
  }
  return info.paramNames[index] ?? null;
}

function findAncestorPrototype(block: ScratchBlock): ProcedureProtoBlock | null {
  let current: ScratchBlock | null = block;
  while (current) {
    if (current.type === 'procedures_prototype') {
      return current as ProcedureProtoBlock;
    }
    current = (current.getParent?.() ?? null) as ScratchBlock | null;
  }
  return null;
}

function buildArgumentInfoFromProto(proto: ProcedureProtoBlock): ProcedureArgumentInfo {
  const displayNames = getDisplayNamesFromProto(proto);
  return {
    displayNames,
    paramNames: procedureParamNamesFromProto(proto),
  };
}

/** procCode → 参数显示名 / Python 形参名映射表。 */
export function buildProcedureArgumentRegistry(
  procedureDefinitions: ScratchBlock[],
): Map<string, ProcedureArgumentInfo> {
  const registry = new Map<string, ProcedureArgumentInfo>();

  for (const def of procedureDefinitions) {
    const proto = getInputTargetBlock(def, 'custom_block') as ProcedureProtoBlock | null;
    if (!proto) {
      continue;
    }
    const procCode = getProcCodeFromBlock(proto);
    if (!procCode) {
      continue;
    }
    registry.set(procCode, buildArgumentInfoFromProto(proto));
  }

  return registry;
}

/** 将 argument_reporter_* 积木解析为对应 Python 形参名。 */
export function argumentReporterToPython(block: ScratchBlock): string | null {
  if (
    block.type !== 'argument_reporter_boolean' &&
    block.type !== 'argument_reporter_string_number'
  ) {
    return null;
  }

  const displayName = getFieldValue(block, 'VALUE');
  if (!displayName) {
    return null;
  }

  const context = getActiveGenerateContext();

  if (context?.currentProcedureProcCode && context.procedureArguments) {
    const info = context.procedureArguments.get(context.currentProcedureProcCode);
    if (info) {
      const param = resolveParamFromArgumentInfo(info, displayName);
      if (param) {
        return param;
      }
    }
  }

  const ancestorProto = findAncestorPrototype(block);
  if (ancestorProto) {
    const param = resolveParamFromArgumentInfo(
      buildArgumentInfoFromProto(ancestorProto),
      displayName,
    );
    if (param) {
      return param;
    }
  }

  if (context?.procedureArguments) {
    for (const info of context.procedureArguments.values()) {
      const param = resolveParamFromArgumentInfo(info, displayName);
      if (param) {
        return param;
      }
    }
  }

  const trimmed = displayName.trim();
  return trimmed ? displayNameToPythonIdentifier(trimmed) : null;
}
