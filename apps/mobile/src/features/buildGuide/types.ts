import type { MpdManifest } from '@scratch-mobile/build-guide';
import type {
  LdrPartsBuilderFacade,
  LdrStepHandlerFacade,
  LoadedLdrModel,
} from '@scratch-mobile/ldr-engine';

export type BuildGuideManifest = MpdManifest;

export type BuildGuideBundle = {
  manifest: BuildGuideManifest;
  model: LoadedLdrModel | null;
  stepHandler: LdrStepHandlerFacade | null;
  partsBuilder: LdrPartsBuilderFacade | null;
  loading: boolean;
  progress: number;
  error: Error | null;
};