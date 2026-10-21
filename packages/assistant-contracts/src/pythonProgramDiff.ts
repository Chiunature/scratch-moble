export type AssistantPythonDiff = {
  removed: string[];
  added: string[];
};

export type AssistantPythonOmissionAssessment = AssistantPythonDiff & {
  blockAccept: boolean;
  message: string | null;
};

const CLEAR_INTENT =
  /清空|删除全部|全部删除|全部清|重写全部|全部重写|从零|清空工作区|不要任何积木/;
const DELETE_INTENT = /删除|删掉|去掉|移除|不要/;

function compactPython(line: string): string {
  let result = '';
  for (const char of line) {
    if (char === ' ' || char === '\t' || char === '(' || char === ')') continue;
    result += char;
  }
  return result;
}

function canonicalizeQuotes(source: string): string {
  return source.replace(/"/g, "'");
}

/** 抽出可比较的语句行：去掉注释、空行、自动 global / 初始化与循环节拍。 */
export function assistantPythonStatements(source: string): string[] {
  const kept: string[] = [];
  let skippingLead = true;
  for (const raw of canonicalizeQuotes(source).split(/\r?\n/)) {
    const withoutComment = raw.replace(/(^|[^\\])#.*$/, '$1').trim();
    if (!withoutComment) continue;
    if (compactPython(withoutComment) === '_os.sleep_s0.001') continue;
    if (skippingLead && /^global\s+/.test(withoutComment)) continue;
    if (
      skippingLead &&
      /^[A-Za-z_][A-Za-z0-9_]* = (?:0|PikaStdData\.List\(\))$/.test(
        withoutComment,
      )
    ) {
      continue;
    }
    skippingLead = false;
    kept.push(withoutComment);
  }
  return kept;
}

function statementKey(line: string): string {
  return compactPython(line);
}

/** 对比两份程序：旧有新无、旧无新有（按语句多重集）。 */
export function diffAssistantPython(
  original: string,
  next: string,
): AssistantPythonDiff {
  const originalLines = assistantPythonStatements(original);
  const nextLines = assistantPythonStatements(next);
  const nextBag = new Map<string, number>();
  for (const line of nextLines) {
    const key = statementKey(line);
    nextBag.set(key, (nextBag.get(key) ?? 0) + 1);
  }
  const removed: string[] = [];
  for (const line of originalLines) {
    const key = statementKey(line);
    const count = nextBag.get(key) ?? 0;
    if (count > 0) nextBag.set(key, count - 1);
    else removed.push(line);
  }

  const originalBag = new Map<string, number>();
  for (const line of originalLines) {
    const key = statementKey(line);
    originalBag.set(key, (originalBag.get(key) ?? 0) + 1);
  }
  const added: string[] = [];
  for (const line of nextLines) {
    const key = statementKey(line);
    const count = originalBag.get(key) ?? 0;
    if (count > 0) originalBag.set(key, count - 1);
    else added.push(line);
  }
  return { removed, added };
}

export function promptAllowsClearingProgram(prompt: string): boolean {
  return CLEAR_INTENT.test(prompt);
}

export function promptAllowsDeletingStatements(prompt: string): boolean {
  return CLEAR_INTENT.test(prompt) || DELETE_INTENT.test(prompt);
}

/**
 * 小改时若新程序净减少多条语句，且用户未要求删除/清空，则拦住接受。
 * 只改参数（例如功率 30→60）会表现为删旧行、加新行，条数不变，不拦截。
 * 用户说了删除/去掉时允许少语句。
 */
export function assessAssistantPythonOmission(input: {
  prompt: string;
  originalPython: string;
  candidatePython: string;
}): AssistantPythonOmissionAssessment {
  const diff = diffAssistantPython(input.originalPython, input.candidatePython);
  const allowsDelete = promptAllowsDeletingStatements(input.prompt);
  if (promptAllowsClearingProgram(input.prompt)) {
    return { ...diff, blockAccept: false, message: null };
  }
  const originalCount = assistantPythonStatements(input.originalPython).length;
  const candidateCount = assistantPythonStatements(
    input.candidatePython,
  ).length;
  if (originalCount === 0) {
    return { ...diff, blockAccept: false, message: null };
  }
  if (candidateCount === 0) {
    return {
      ...diff,
      blockAccept: true,
      message: '新程序是空的，但你没有要求清空。请保留原程序并只做需要的修改。',
    };
  }
  const netRemoved = originalCount - candidateCount;
  if (allowsDelete || netRemoved < 2) {
    return { ...diff, blockAccept: false, message: null };
  }
  const preview = diff.removed.slice(0, 8).join('\n');
  const more =
    diff.removed.length > 8 ? `\n… 另有 ${diff.removed.length - 8} 条` : '';
  return {
    ...diff,
    blockAccept: true,
    message: `疑似漏写：新程序比原来少了 ${netRemoved} 条语句。请输出完整主程序，保留未要求删除的语句。\n${preview}${more}`,
  };
}
