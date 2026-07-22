import type { BuildGuideSettings } from './types';

type LdrOptionsRuntime = {
  lineContrast: number;
  showOldColors: number;
  studHighContrast: number;
  studLogo: number;
  oldColor: number;
  lineColor: number;
};

type LdrRuntime = {
  Options?: LdrOptionsRuntime;
  Studs?: {
    makeGenerators: (
      force: string,
      highContrast: boolean,
      logoType: number,
    ) => void;
  };
};

function getLdr(): LdrRuntime | undefined {
  return (globalThis as typeof globalThis & { LDR?: LdrRuntime }).LDR;
}

/**
 * 同步到 LDR.Options，供 WebGPU 材质 / stud 加载读取。
 * 动画速度只走 React prop，不写入 Options。
 * canBeOld 由 applyWebGpuMaterials 注册时设置。
 */
export function syncLdrOptions(settings: BuildGuideSettings): void {
  const LDR = getLdr();
  if (!LDR) {
    return;
  }

  const next: LdrOptionsRuntime = {
    lineContrast: settings.lineContrast,
    showOldColors: settings.showOldColors,
    studHighContrast: settings.studHighContrast,
    studLogo: settings.studLogo,
    oldColor: LDR.Options?.oldColor ?? 0xffff6f,
    lineColor: settings.lineContrast === 0 ? 0 : 0x333333,
  };
  LDR.Options = next;
}

/**
 * 按当前 LDR.Options 注册 stud 生成器。
 * 由 loadMpdModel 在 parse 前调用，保证与本次加载一致。
 */
export function applyStudGeneratorsFromOptions(): void {
  const LDR = getLdr();
  if (!LDR?.Studs?.makeGenerators || !LDR.Options) {
    return;
  }
  LDR.Studs.makeGenerators(
    '',
    LDR.Options.studHighContrast === 1,
    LDR.Options.studLogo,
  );
}
