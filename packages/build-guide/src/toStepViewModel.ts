import type { MpdManifest, RuntimeStepOverride } from './schema';

export type BuildGuidePartViewModel = {
  id: string;
  nameKey: string;
  color?: string;
};

export type BuildGuideStepViewModel = {
  id: string;
  index: number;
  titleKey: string;
  descriptionKey: string;
  parts: BuildGuidePartViewModel[];
  newPartIds: string[];
  displayScale?: number;
  camera?: RuntimeStepOverride['camera'];
};

export type BuildGuideManifestViewModel = {
  id: string;
  nameKey: string;
  mpdUri: string;
  mainModelId: string;
  partsSource?: MpdManifest['partsSource'];
  partsBaseUrl?: string;
  mainModelColor?: number;
  displayScale?: number;
  cameraDefault?: RuntimeStepOverride['camera'];
  steps?: RuntimeStepOverride[];
};

export function toManifestViewModel(manifest: MpdManifest): BuildGuideManifestViewModel {
  return {
    id: manifest.id,
    nameKey: manifest.nameKey,
    mpdUri: manifest.mpdUri,
    mainModelId: manifest.mainModelId,
    partsSource: manifest.partsSource,
    partsBaseUrl: manifest.partsBaseUrl,
    mainModelColor: manifest.mainModelColor,
    displayScale: manifest.displayScale,
    cameraDefault: manifest.cameraDefault,
    steps: manifest.steps,
  };
}

export function resolveStepViewModel(
  manifest: BuildGuideManifestViewModel,
  stepIndex: number,
  totalSteps: number,
): BuildGuideStepViewModel {
  const override = manifest.steps?.find(step => step.index === stepIndex);

  return {
    id: override ? `step-${stepIndex + 1}` : `step-${stepIndex + 1}`,
    index: stepIndex,
    titleKey: override?.titleKey ?? 'stepGenericTitle',
    descriptionKey: override?.descriptionKey ?? 'stepGenericDescription',
    parts: [],
    newPartIds: [],
    displayScale: override?.displayScale ?? manifest.displayScale,
    camera: override?.camera ?? manifest.cameraDefault,
  };
}
