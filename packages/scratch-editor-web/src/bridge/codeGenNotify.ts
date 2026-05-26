/** 由 main 注册；RN 回写 field 后显式触发 codegen，避免仅靠 change 监听漏刷 */
let flushCodeGeneration: (() => void) | null = null;

export function registerCodeGenerationFlush(flush: () => void): void {
  flushCodeGeneration = flush;
}

export function notifyCodeGenerationNeeded(): void {
  flushCodeGeneration?.();
}
