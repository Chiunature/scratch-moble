import { useCallback, useMemo, useState } from 'react';

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
): UseBuildGuideStepsResult {
  const totalSteps = manifest.steps.length;
  const [currentIndex, setCurrentIndex] = useState(0);

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(index, totalSteps - 1)),
    [totalSteps],
  );

  const currentStep = manifest.steps[clampIndex(currentIndex)];

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => clampIndex(prev - 1));
  }, [clampIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex(prev => clampIndex(prev + 1));
  }, [clampIndex]);

  const goToStep = useCallback(
    (index: number) => {
      setCurrentIndex(clampIndex(index));
    },
    [clampIndex],
  );

  return useMemo(
    () => ({
      currentIndex,
      currentStep,
      totalSteps,
      isLastStep: currentIndex === totalSteps - 1,
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
