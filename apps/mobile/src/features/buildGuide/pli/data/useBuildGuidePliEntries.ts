import { useMemo } from 'react';

import {
  resolveModelStepPliEntries,
  type LoadedLdrModel,
} from '@scratch-mobile/ldr-engine';

import { buildPliViewModels, type BuildGuidePliItemViewModel } from './buildPliViewModels';

type BuildGuidePliEntriesState = {
  items: ReadonlyArray<BuildGuidePliItemViewModel>;
  error: Error | null;
};

function normalizePliError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

export function useBuildGuidePliEntries(
  model: LoadedLdrModel | null,
  stepIndex: number,
): BuildGuidePliEntriesState {
  return useMemo(() => {
    if (!model) {
      return {
        items: [],
        error: null,
      };
    }

    try {
      const entries = resolveModelStepPliEntries(model, stepIndex);
      return {
        items: buildPliViewModels(entries),
        error: null,
      };
    } catch (cause: unknown) {
      return {
        items: [],
        error: normalizePliError(cause),
      };
    }
  }, [model, stepIndex]);
}