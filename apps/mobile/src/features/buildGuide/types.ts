import type { BuildGuidePartViewModel, BuildGuideStepViewModel } from '@scratch-mobile/build-guide';

export type BuildGuidePart = BuildGuidePartViewModel;
export type BuildGuideStep = BuildGuideStepViewModel;

export type BuildGuideManifest = {
  id: string;
  nameKey: string;
  steps: BuildGuideStep[];
};

export type BuildGuideBundle = {
  manifest: BuildGuideManifest;
  glbAssets: Record<string, number>;
};
