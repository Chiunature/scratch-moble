import { useCallback, useEffect, useMemo, useState } from 'react';

import { resolveStepViewModel } from '@scratch-mobile/build-guide';
import type { LdrStepHandlerFacade } from '@scratch-mobile/ldr-engine';

import type { BuildGuideManifest, BuildGuideStep } from '../types';

type UseBuildGuideStepsResult = {
  currentIndex: number;
  currentStep: BuildGuideStep;
  totalSteps: number;
  isLastStep: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  progress: number;
  goPrev: () => void;
  goNext: () => void;
  goToStep: (index: number) => void;
};

export function useBuildGuideSteps(
  manifest: BuildGuideManifest,
  stepHandler: LdrStepHandlerFacade | null,
): UseBuildGuideStepsResult {
  const totalSteps = stepHandler?.getTotalSteps() ?? 0;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [stepHandler]);

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(index, Math.max(totalSteps - 1, 0))),
    [totalSteps],
  );

  const applyStepIndex = useCallback(
    (index: number) => {
      setCurrentIndex(clampIndex(index));
    },
    [clampIndex],
  );

  const currentStep = useMemo(
    () => resolveStepViewModel(manifest, currentIndex, totalSteps),
    [currentIndex, manifest, totalSteps],
  );

  const goPrev = useCallback(() => {
    applyStepIndex(currentIndex - 1);
  }, [applyStepIndex, currentIndex]);

  const goNext = useCallback(() => {
    applyStepIndex(currentIndex + 1);
  }, [applyStepIndex, currentIndex]);

  const goToStep = useCallback(
    (index: number) => {
      applyStepIndex(index);
    },
    [applyStepIndex],
  );

  return useMemo(
    () => ({
      currentIndex,
      currentStep,
      totalSteps,
      isLastStep: totalSteps > 0 && currentIndex === totalSteps - 1,
      canGoPrev: currentIndex > 0,
      canGoNext: currentIndex < totalSteps - 1,
      progress: totalSteps > 0 ? (currentIndex + 1) / totalSteps : 0,
      goPrev,
      goNext,
      goToStep,
    }),
    [currentIndex, currentStep, totalSteps, goPrev, goNext, goToStep],
  );
}
