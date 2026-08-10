import type { LdrGlobalNamespace, LdrOptions } from './types';

export const DEFAULT_LDR_OLD_COLOR = 0xffff6f;

type LdrScope = typeof globalThis & { LDR?: LdrGlobalNamespace };

function getGlobalLdr(): LdrGlobalNamespace | undefined {
  return (globalThis as LdrScope).LDR;
}

function readOptions(): Partial<LdrOptions> | undefined {
  return getGlobalLdr()?.Options;
}

/**
 * 合并写 LDR.Options：缺失字段保留旧值，oldColor 无旧值时用默认。
 * 相比整对象覆写，不会抹掉 vendor 或后续代码写入的其他字段（如 showEditor）。
 */
export function setLdrOptions(partial: Partial<LdrOptions>): void {
  const current = readOptions();
  const next: Partial<LdrOptions> = { ...current, ...partial };
  if (next.oldColor === undefined) {
    next.oldColor = DEFAULT_LDR_OLD_COLOR;
  }

  const LDR = getGlobalLdr();
  if (LDR) {
    LDR.Options = next;
  }
}

/** 读当前 LDR.Options；未设置时返回 undefined（字段缺省均补默认值）。 */
export function getLdrOptions(): LdrOptions | undefined {
  const current = readOptions();
  if (!current) {
    return undefined;
  }

  return {
    lineContrast: current.lineContrast ?? 0,
    showOldColors: current.showOldColors ?? 0,
    studHighContrast: current.studHighContrast ?? 0,
    studLogo: current.studLogo ?? 0,
    oldColor: current.oldColor ?? DEFAULT_LDR_OLD_COLOR,
    lineColor: current.lineColor ?? 0x333333,
    ...(current.showEditor !== undefined
      ? { showEditor: current.showEditor }
      : {}),
  };
}

/**
 * 按当前 LDR.Options 注册 stud 生成器（高对比 / logo）。
 * 由 loadMpdModel 在 parse 前调用，保证与本次加载一致。
 */
export function applyStudGenerators(): void {
  const LDR = getGlobalLdr();
  const options = readOptions();
  if (!LDR?.Studs?.makeGenerators) {
    return;
  }

  LDR.Studs.makeGenerators(
    '',
    options?.studHighContrast === 1,
    options?.studLogo ?? 0,
  );
}