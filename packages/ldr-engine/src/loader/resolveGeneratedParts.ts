import type { LdrLoaderInstance } from '../types';

export function resolveGeneratedParts(
  loader: LdrLoaderInstance,
  ids: string[],
): string[] {
  if (!LDR.Generator) {
    return ids;
  }

  let remaining = ids;
  let improved = true;

  while (improved) {
    improved = false;
    const stillRemaining: string[] = [];
    const seen: Record<string, boolean> = {};

    for (const id of remaining) {
      if (seen[id]) {
        continue;
      }
      seen[id] = true;

      const generated = LDR.Generator.make(id);
      if (generated) {
        loader.setPartType(generated);
        for (const step of generated.steps) {
          for (const subModel of step.subModels) {
            stillRemaining.push(subModel.ID);
          }
        }
        improved = true;
      } else {
        stillRemaining.push(id);
      }
    }

    remaining = stillRemaining;
  }

  return remaining;
}

export function createFallbackPart(loader: LdrLoaderInstance, id: string): void {
  if (!LDR.Generator) {
    delete loader.partTypes[id];
    return;
  }

  const fallback = LDR.Generator.bx(4095, 63);
  fallback.ID = fallback.name = id;
  fallback.modelDescription = `Missing part placeholder for ${id}`;
  loader.setPartType(fallback);
}
