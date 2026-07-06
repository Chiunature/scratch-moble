export type BuildGuidePart = {
  id: string;
  nameKey: string;
  color?: string;
};

export type BuildGuideStep = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  parts: BuildGuidePart[];
};

export type BuildGuideManifest = {
  id: string;
  nameKey: string;
  steps: BuildGuideStep[];
};
