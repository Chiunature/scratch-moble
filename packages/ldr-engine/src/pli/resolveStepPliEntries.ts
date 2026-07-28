import type {
  LdrColorInfo,
  LdrLoaderInstance,
  LdrParsedStep,
  LdrParsedSubModel,
  LdrPartType,
  LoadedLdrModel,
} from '../types';
import type { LdrPliEntry } from './types';

type PliPartResolution = {
  partID: string;
  sourcePartID?: string;
};

type ResolveStepPliEntriesOptions = {
  inheritedColor?: number;
  multiplier?: number;
};

type IndexedStepResolution = {
  step: LdrParsedStep;
  inheritedColor: number;
  multiplier: number;
};

type DisplayStepCountCache = Map<string, number>;

function normalizePartID(id: string): string {
  return id.replace(/\\/g, '/').toLowerCase();
}

function createEntryKey(partID: string, colorID: number): string {
  const normalizedID = partID.endsWith('.dat')
    ? partID.slice(0, partID.length - 4)
    : partID;
  return `${normalizedID}_${colorID}`;
}

function colorToHex(value: number): string {
  return `#${(value & 0xffffff).toString(16).padStart(6, '0')}`;
}

function getColorInfo(colorID: number): LdrColorInfo | undefined {
  return (
    globalThis as typeof globalThis & {
      LDR?: { Colors?: Record<number, LdrColorInfo> };
    }
  ).LDR?.Colors?.[colorID];
}

function resolveColorFields(colorID: number): Pick<
  LdrPliEntry,
  'colorName' | 'colorHex' | 'edgeHex'
> {
  const colorInfo = getColorInfo(colorID);
  return {
    colorName: colorInfo?.name ?? `Color ${colorID}`,
    colorHex: colorInfo ? colorToHex(colorInfo.value) : '#808080',
    edgeHex: colorInfo ? colorToHex(colorInfo.edge) : '#333333',
  };
}

function resolvePartType(
  loader: LdrLoaderInstance,
  partID: string,
): LdrPartType | undefined {
  return loader.getPartType(normalizePartID(partID));
}

function resolveInheritedColor(colorID: number, inheritedColor: number): number {
  return colorID === 16 ? inheritedColor : colorID;
}

function stepContainsNonPartSubModels(
  loader: LdrLoaderInstance,
  step: LdrParsedStep,
): boolean {
  if (typeof step.containsNonPartSubModels === 'function') {
    return step.containsNonPartSubModels(loader);
  }

  if (step.subModels.length === 0) {
    return false;
  }

  return step.subModels.every(subModel => {
    const partType = resolvePartType(loader, subModel.ID);
    return partType != null && partType.isPart !== true;
  });
}

function getDisplayStepCount(
  loader: LdrLoaderInstance,
  partID: string,
  cache: DisplayStepCountCache,
): number {
  const normalizedID = normalizePartID(partID);
  const cached = cache.get(normalizedID);
  if (cached != null) {
    return cached;
  }

  const partType = resolvePartType(loader, normalizedID);
  if (!partType?.steps?.length) {
    cache.set(normalizedID, 0);
    return 0;
  }

  let count = partType.steps.length;
  for (const step of partType.steps) {
    if (!stepContainsNonPartSubModels(loader, step)) {
      continue;
    }

    const firstSubModel = step.subModels[0];
    if (!firstSubModel) {
      continue;
    }

    count += getDisplayStepCount(loader, firstSubModel.ID, cache);
  }

  cache.set(normalizedID, count);
  return count;
}

function resolveIndexedStep(
  loader: LdrLoaderInstance,
  partID: string,
  inheritedColor: number,
  multiplier: number,
  stepIndex: number,
  cache: DisplayStepCountCache,
): IndexedStepResolution | null {
  if (stepIndex < 0) {
    return null;
  }

  const partType = resolvePartType(loader, partID);
  if (!partType?.steps?.length) {
    return null;
  }

  let cursor = 0;
  for (const step of partType.steps) {
    if (stepContainsNonPartSubModels(loader, step)) {
      const firstSubModel = step.subModels[0];
      if (firstSubModel) {
        const subStepCount = getDisplayStepCount(
          loader,
          firstSubModel.ID,
          cache,
        );
        if (stepIndex < cursor + subStepCount) {
          return resolveIndexedStep(
            loader,
            firstSubModel.ID,
            resolveInheritedColor(firstSubModel.c, inheritedColor),
            multiplier * step.subModels.length,
            stepIndex - cursor,
            cache,
          );
        }
        cursor += subStepCount;
      }
    }

    if (stepIndex === cursor) {
      return {
        step,
        inheritedColor,
        multiplier,
      };
    }

    cursor += 1;
  }

  return null;
}

function resolvePliPartID(
  loader: LdrLoaderInstance,
  part: LdrParsedSubModel,
): PliPartResolution | null {
  if (part.REPLACEMENT_PLI === true) {
    return null;
  }

  const sourcePartID = normalizePartID(part.ID);
  const explicitPartID =
    typeof part.REPLACEMENT_PLI === 'string'
      ? normalizePartID(part.REPLACEMENT_PLI)
      : sourcePartID;
  const partType = resolvePartType(loader, explicitPartID);
  const replacementPartID = partType?.replacement
    ? normalizePartID(partType.replacement)
    : explicitPartID;

  return {
    partID: replacementPartID,
    sourcePartID:
      replacementPartID === sourcePartID ? undefined : sourcePartID,
  };
}

function resolveDescription(partType: LdrPartType | undefined): string | undefined {
  return partType?.modelDescription ?? partType?.name;
}

function resolveAnnotation(partType: LdrPartType | undefined): string | undefined {
  return typeof partType?.annotation === 'string' ? partType.annotation : undefined;
}

function createEntry(
  loader: LdrLoaderInstance,
  partID: string,
  colorID: number,
  amount: number,
  sourcePartID?: string,
): LdrPliEntry {
  const partType = resolvePartType(loader, partID);
  return {
    key: createEntryKey(partID, colorID),
    partID,
    c: colorID,
    amount,
    ...resolveColorFields(colorID),
    description: resolveDescription(partType),
    annotation: resolveAnnotation(partType),
    sourcePartID,
  };
}

function sortPliEntries(a: LdrPliEntry, b: LdrPliEntry): number {
  if (a.c !== b.c) {
    return a.c - b.c;
  }
  return a.partID.localeCompare(b.partID);
}

export function resolveStepPliEntries(
  loader: LdrLoaderInstance,
  step: LdrParsedStep | null | undefined,
  options: ResolveStepPliEntriesOptions = {},
): LdrPliEntry[] {
  if (!step?.subModels?.length) {
    return [];
  }

  const inheritedColor = options.inheritedColor ?? 16;
  const multiplier = options.multiplier ?? 1;
  const entriesByKey = new Map<string, LdrPliEntry>();

  for (const subModel of step.subModels) {
    const resolved = resolvePliPartID(loader, subModel);
    if (!resolved) {
      continue;
    }

    const colorID = resolveInheritedColor(subModel.c, inheritedColor);
    const key = createEntryKey(resolved.partID, colorID);
    const existing = entriesByKey.get(key);
    if (existing) {
      existing.amount += multiplier;
      continue;
    }

    entriesByKey.set(
      key,
      createEntry(
        loader,
        resolved.partID,
        colorID,
        multiplier,
        resolved.sourcePartID,
      ),
    );
  }

  return Array.from(entriesByKey.values()).sort(sortPliEntries);
}

export function resolveModelStepPliEntries(
  model: LoadedLdrModel,
  stepIndex: number,
): LdrPliEntry[] {
  const resolved = resolveIndexedStep(
    model.loader,
    model.mainModelId,
    model.mainModelColor,
    1,
    stepIndex,
    new Map(),
  );

  if (!resolved) {
    return [];
  }

  return resolveStepPliEntries(model.loader, resolved.step, {
    inheritedColor: resolved.inheritedColor,
    multiplier: resolved.multiplier,
  });
}

export function resolveCurrentStepPliEntries(
  model: LoadedLdrModel,
): LdrPliEntry[] {
  return resolveModelStepPliEntries(model, model.stepHandler.getCurrentStepIndex());
}
