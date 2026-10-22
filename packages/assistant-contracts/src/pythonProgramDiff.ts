import {
  assistantPythonStatements,
  normalizePythonStatementKey,
} from './pythonNormalize';

export type AssistantPythonDiff = {
  removed: string[];
  added: string[];
};

export type AssistantProgramEditMode =
  | 'revise'
  | 'delete'
  | 'keep-only'
  | 'clear';

export type AssistantProgramEditScope = 'main' | 'procedures' | 'workspace';

export type AssistantProgramEditAllow = 'add' | 'remove' | 'replace';

export type AssistantProgramEdit = {
  mode: AssistantProgramEditMode;
  scope: AssistantProgramEditScope;
  allow: AssistantProgramEditAllow[];
  add: string[];
  targets: string[];
  keep: string[];
  replacements: Array<{ from: string; to: string }>;
};

export type AssistantPythonOmissionAssessment = AssistantPythonDiff & {
  blockAccept: boolean;
  message: string | null;
};

function bagAdd(bag: Map<string, number>, key: string, delta = 1) {
  if (!key) return;
  bag.set(key, (bag.get(key) ?? 0) + delta);
}

function bagFromLines(lines: string[]): Map<string, number> {
  const bag = new Map<string, number>();
  for (const line of lines) bagAdd(bag, line);
  return bag;
}

function normalizeDeclaredLines(lines: string[]): string[] {
  return lines
    .map(line => normalizePythonStatementKey(line))
    .filter(Boolean);
}

function consume(bag: Map<string, number>, key: string): boolean {
  const count = bag.get(key) ?? 0;
  if (count <= 0) return false;
  if (count === 1) bag.delete(key);
  else bag.set(key, count - 1);
  return true;
}

function countOf(bag: Map<string, number>, key: string): number {
  return bag.get(key) ?? 0;
}

function keysWithPositive(bag: Map<string, number>): string[] {
  const result: string[] = [];
  for (const [key, count] of bag) {
    for (let i = 0; i < count; i += 1) result.push(key);
  }
  return result;
}

/** 对比两份程序：旧有新无、旧无新有（按规范化语句多重集）。 */
export function diffAssistantPython(
  original: string,
  next: string,
): AssistantPythonDiff {
  const originalLines = assistantPythonStatements(original);
  const nextLines = assistantPythonStatements(next);
  const nextBag = bagFromLines(nextLines);
  const removed: string[] = [];
  for (const line of originalLines) {
    if (!consume(nextBag, line)) removed.push(line);
  }
  const originalBag = bagFromLines(originalLines);
  const added: string[] = [];
  for (const line of nextLines) {
    if (!consume(originalBag, line)) added.push(line);
  }
  return { removed, added };
}

function allows(
  edit: AssistantProgramEdit,
  action: AssistantProgramEditAllow,
): boolean {
  return edit.allow.includes(action);
}

function validateEditShape(
  edit: AssistantProgramEdit,
): string | null {
  if (edit.scope === 'workspace' && edit.mode !== 'clear') {
    return 'scope=workspace 只能与 mode=clear 一起使用。';
  }
  if (edit.mode === 'clear' && edit.scope === 'workspace') {
    return null;
  }
  if (edit.mode === 'revise') {
    if (!allows(edit, 'add') && !allows(edit, 'replace')) {
      return 'revise 至少要允许 add 或 replace。';
    }
    if (allows(edit, 'remove') && edit.targets.length === 0) {
      // remove without targets is unused in revise; replacements cover deletes
    }
  }
  return null;
}

/**
 * 按模型声明的 program_edit 验收候选。
 * 只看声明、原快照 Python 与候选 Python，不回读用户原话。
 */
export function assessAssistantProgramEdit(input: {
  programEdit: AssistantProgramEdit;
  originalPython: string;
  candidatePython: string;
}): AssistantPythonOmissionAssessment {
  const diff = diffAssistantPython(input.originalPython, input.candidatePython);
  const shapeError = validateEditShape(input.programEdit);
  if (shapeError) {
    return { ...diff, blockAccept: true, message: shapeError };
  }

  const edit = input.programEdit;
  const originalBag = bagFromLines(assistantPythonStatements(input.originalPython));
  const candidateBag = bagFromLines(
    assistantPythonStatements(input.candidatePython),
  );
  const declaredAdd = bagFromLines(normalizeDeclaredLines(edit.add));
  const declaredTargets = bagFromLines(normalizeDeclaredLines(edit.targets));
  const declaredKeep = bagFromLines(normalizeDeclaredLines(edit.keep));
  const declaredFrom = bagFromLines(
    normalizeDeclaredLines(edit.replacements.map(item => item.from)),
  );
  const declaredTo = bagFromLines(
    normalizeDeclaredLines(edit.replacements.map(item => item.to)),
  );

  if (edit.mode === 'clear') {
    if (edit.scope === 'workspace') {
      if (assistantPythonStatements(input.candidatePython).length > 0) {
        return {
          ...diff,
          blockAccept: true,
          message: 'clear + workspace 要求候选 Python 为空。',
        };
      }
      return { ...diff, blockAccept: false, message: null };
    }
    // clear + main：主程序语句应为空（元数据/过程定义可能仍在 procedures scope）
    if (assistantPythonStatements(input.candidatePython).length > 0) {
      return {
        ...diff,
        blockAccept: true,
        message: 'clear + main 要求主程序语句为空。',
      };
    }
    return { ...diff, blockAccept: false, message: null };
  }

  if (edit.mode === 'keep-only') {
    for (const line of keysWithPositive(candidateBag)) {
      if (countOf(declaredKeep, line) <= 0) {
        return {
          ...diff,
          blockAccept: true,
          message: `keep-only 候选含未声明保留的语句：${line}`,
        };
      }
    }
    for (const keep of keysWithPositive(declaredKeep)) {
      if (countOf(originalBag, keep) > 0 && countOf(candidateBag, keep) <= 0) {
        return {
          ...diff,
          blockAccept: true,
          message: `keep-only 应保留的语句消失了：${keep}`,
        };
      }
    }
    return { ...diff, blockAccept: false, message: null };
  }

  // Expected removes / adds from declaration
  const expectedRemoved = new Map<string, number>();
  const expectedAdded = new Map<string, number>();

  if (edit.mode === 'revise') {
    for (const [key, count] of declaredFrom) {
      bagAdd(expectedRemoved, key, count);
    }
    for (const [key, count] of declaredTo) {
      bagAdd(expectedAdded, key, count);
    }
    for (const [key, count] of declaredAdd) {
      bagAdd(expectedAdded, key, count);
    }
    // Every actual removal must be explained by replacements.from
    for (const line of diff.removed) {
      if (!consume(expectedRemoved, line)) {
        return {
          ...diff,
          blockAccept: true,
          message: `revise 出现未声明的删除：${line}。每条删除必须对应 replacements.from。`,
        };
      }
    }
    for (const leftover of keysWithPositive(expectedRemoved)) {
      return {
        ...diff,
        blockAccept: true,
        message: `revise 声明要替换的语句仍在候选中或未删除：${leftover}`,
      };
    }
    for (const line of diff.added) {
      if (!consume(expectedAdded, line)) {
        return {
          ...diff,
          blockAccept: true,
          message: `revise 出现未声明的新增：${line}`,
        };
      }
    }
    for (const leftover of keysWithPositive(expectedAdded)) {
      return {
        ...diff,
        blockAccept: true,
        message: `revise 声明要新增的语句未出现：${leftover}`,
      };
    }
    return { ...diff, blockAccept: false, message: null };
  }

  // delete mode
  if (!allows(edit, 'remove') && diff.removed.length > 0) {
    return {
      ...diff,
      blockAccept: true,
      message: 'delete 未允许 remove，却出现了删除。',
    };
  }
  for (const line of diff.removed) {
    if (countOf(declaredTargets, line) <= 0 && countOf(declaredFrom, line) <= 0) {
      return {
        ...diff,
        blockAccept: true,
        message: `delete 删除不在 targets / replacements.from 中：${line}`,
      };
    }
    if (countOf(declaredTargets, line) > 0) consume(declaredTargets, line);
    else consume(declaredFrom, line);
  }
  for (const leftover of keysWithPositive(declaredTargets)) {
    return {
      ...diff,
      blockAccept: true,
      message: `delete 声明的 targets 仍在候选中：${leftover}`,
    };
  }

  if (diff.added.length > 0 && !allows(edit, 'add') && !allows(edit, 'replace')) {
    return {
      ...diff,
      blockAccept: true,
      message: 'delete 未允许 add/replace，却出现了新增。',
    };
  }
  if (allows(edit, 'replace') || allows(edit, 'add')) {
    for (const [key, count] of declaredTo) bagAdd(expectedAdded, key, count);
    for (const [key, count] of declaredAdd) bagAdd(expectedAdded, key, count);
    for (const line of diff.added) {
      if (!consume(expectedAdded, line)) {
        return {
          ...diff,
          blockAccept: true,
          message: `delete 出现未声明的新增：${line}`,
        };
      }
    }
    for (const leftover of keysWithPositive(expectedAdded)) {
      return {
        ...diff,
        blockAccept: true,
        message: `delete 声明要新增的语句未出现：${leftover}`,
      };
    }
  } else if (diff.added.length > 0) {
    return {
      ...diff,
      blockAccept: true,
      message: 'delete 未允许新增。',
    };
  }

  return { ...diff, blockAccept: false, message: null };
}

/**
 * 判断修复响应里的 program_edit 是否相对锁定声明被加宽或改范围。
 * 加宽：换 mode、换 scope、allow 增加、新增声明行、扩大 targets/keep。
 */
export function isProgramEditWidened(
  locked: AssistantProgramEdit,
  next: AssistantProgramEdit,
): boolean {
  if (locked.mode !== next.mode) return true;
  if (locked.scope !== next.scope) return true;
  for (const action of next.allow) {
    if (!locked.allow.includes(action)) return true;
  }
  const lockedAdd = bagFromLines(normalizeDeclaredLines(locked.add));
  const nextAdd = bagFromLines(normalizeDeclaredLines(next.add));
  for (const [key, count] of nextAdd) {
    if ((lockedAdd.get(key) ?? 0) < count) return true;
  }
  const lockedTargets = bagFromLines(normalizeDeclaredLines(locked.targets));
  const nextTargets = bagFromLines(normalizeDeclaredLines(next.targets));
  for (const [key, count] of nextTargets) {
    if ((lockedTargets.get(key) ?? 0) < count) return true;
  }
  const lockedKeep = bagFromLines(normalizeDeclaredLines(locked.keep));
  const nextKeep = bagFromLines(normalizeDeclaredLines(next.keep));
  // keep 变少 = 允许删更多，也算加宽
  for (const [key, count] of lockedKeep) {
    if ((nextKeep.get(key) ?? 0) < count) return true;
  }
  const lockedFrom = bagFromLines(
    normalizeDeclaredLines(locked.replacements.map(item => item.from)),
  );
  const nextFrom = bagFromLines(
    normalizeDeclaredLines(next.replacements.map(item => item.from)),
  );
  for (const [key, count] of nextFrom) {
    if ((lockedFrom.get(key) ?? 0) < count) return true;
  }
  return false;
}

/** @deprecated 使用 assessAssistantProgramEdit */
export function assessAssistantPythonOmission(input: {
  prompt: string;
  originalPython: string;
  candidatePython: string;
  programEdit?: AssistantProgramEdit;
}): AssistantPythonOmissionAssessment {
  if (input.programEdit) {
    return assessAssistantProgramEdit({
      programEdit: input.programEdit,
      originalPython: input.originalPython,
      candidatePython: input.candidatePython,
    });
  }
  const diff = diffAssistantPython(input.originalPython, input.candidatePython);
  return {
    ...diff,
    blockAccept: true,
    message: '缺少 program_edit 授权声明，无法验收。',
  };
}
