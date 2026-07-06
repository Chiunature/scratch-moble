import type { BakedManifest, BakedStep } from './schema';

export type BuildGuidePartViewModel = {
  id: string;
  nameKey: string;
  color?: string;
};

export type BuildGuideStepViewModel = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  parts: BuildGuidePartViewModel[];
  glb: string;
  newPartIds: string[];
  displayScale?: number;
  camera?: BakedStep['camera'];
};

export type BuildGuideManifestViewModel = {
  id: string;
  nameKey: string;
  steps: BuildGuideStepViewModel[];
};

export function toStepViewModel(manifest: BakedManifest): BuildGuideManifestViewModel {
  return {
    id: manifest.id,
    nameKey: manifest.nameKey,
    steps: manifest.steps.map(toSingleStepViewModel),
  };
}

function toSingleStepViewModel(step: BakedStep): BuildGuideStepViewModel {
  const { index: _index, ...viewModel } = step;
  return viewModel;
}
