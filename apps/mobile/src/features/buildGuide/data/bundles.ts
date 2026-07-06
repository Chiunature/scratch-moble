import { Image } from 'react-native';
import {
  parseBakedManifest,
  toStepViewModel,
  type BakedManifest,
} from '@scratch-mobile/build-guide';

import duckDemoManifest from '../../../../assets/buildGuide/duck-demo/manifest.json';
import step001Glb from '../../../../assets/buildGuide/duck-demo/step-001.glb';
import step002Glb from '../../../../assets/buildGuide/duck-demo/step-002.glb';
import step003Glb from '../../../../assets/buildGuide/duck-demo/step-003.glb';
import type { BuildGuideBundle } from '../types';

const duckDemoGlbAssets: Record<string, number> = {
  'step-001.glb': step001Glb,
  'step-002.glb': step002Glb,
  'step-003.glb': step003Glb,
};

function loadBundle(
  baked: BakedManifest,
  glbAssets: Record<string, number>,
): BuildGuideBundle {
  const manifest = toStepViewModel(baked);

  for (const step of manifest.steps) {
    if (!(step.glb in glbAssets)) {
      throw new Error(`missing bundled glb asset: ${step.glb}`);
    }
  }

  return { manifest, glbAssets };
}

export const duckDemoBundle = loadBundle(
  parseBakedManifest(duckDemoManifest),
  duckDemoGlbAssets,
);

export function resolveStepGlbUri(bundle: BuildGuideBundle, stepIndex: number): string {
  const step = bundle.manifest.steps[stepIndex];
  const assetModule = bundle.glbAssets[step.glb];
  return Image.resolveAssetSource(assetModule).uri;
}
