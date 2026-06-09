import type { GenerateContext } from './types';

let activeGenerateContext: GenerateContext | undefined;

/** 在生成单块/表达式时提供当前 GenerateContext（供 argument reporter 等读取）。 */
export function runWithGenerateContext<T>(
  context: GenerateContext,
  fn: () => T,
): T {
  const previous = activeGenerateContext;
  activeGenerateContext = context;
  try {
    return fn();
  } finally {
    activeGenerateContext = previous;
  }
}

export function getActiveGenerateContext(): GenerateContext | undefined {
  return activeGenerateContext;
}
