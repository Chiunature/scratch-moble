import type {
  BuildGuideManifestViewModel,
  BuildGuideStepViewModel,
} from '@scratch-mobile/build-guide';
import type {
  LdrPartsBuilderFacade,
  LdrStepHandlerFacade,
  LoadedLdrModel,
} from '@scratch-mobile/ldr-engine';

export type BuildGuideStep = BuildGuideStepViewModel;

export type BuildGuideManifest = BuildGuideManifestViewModel;

export type BuildGuideBundle = {
  manifest: BuildGuideManifest;
  model: LoadedLdrModel | null;
  stepHandler: LdrStepHandlerFacade | null;
  partsBuilder: LdrPartsBuilderFacade | null;
  loading: boolean;
  progress: number;
  error: Error | null;
};
