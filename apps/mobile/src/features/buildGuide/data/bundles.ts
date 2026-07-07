import { Image } from 'react-native';
import {
  parseMpdManifest,
  toManifestViewModel,
} from '@scratch-mobile/build-guide';

import containerDemoManifest from '../../../../assets/buildGuide/container-demo/manifest.json';
import type { BuildGuideManifest } from '../types';
import teslaModelSManifest from '../../../../assets/buildGuide/teslaModelS/mainfest.json';

/**
 * Metro requires static `require()` for bundled MPD assets.
 * Add a new entry here when introducing another build-guide bundle.
 */
const MPD_ASSET_MODULES = {
  'container-demo': require('../../../../assets/buildGuide/container-demo/.build/export.mpd'),
  teslaModelS: require('../../../../assets/buildGuide/teslaModelS/.build/export.mpd'),
} as const satisfies Record<string, number>;

export type BuildGuideBundleId = keyof typeof MPD_ASSET_MODULES;

export const BUILD_GUIDE_BUNDLE_IDS = Object.keys(
  MPD_ASSET_MODULES,
) as BuildGuideBundleId[];

export const containerDemoManifestParsed = toManifestViewModel(
  parseMpdManifest(containerDemoManifest),
);

export const teslaModelSManifestParsed = toManifestViewModel(
  parseMpdManifest(teslaModelSManifest),
);

export function resolveMpdUri(manifest: BuildGuideManifest): string {
  if (
    manifest.mpdUri.startsWith('http://') ||
    manifest.mpdUri.startsWith('https://')
  ) {
    return manifest.mpdUri;
  }

  const assetModule = getMpdAssetModule(manifest.id);
  return Image.resolveAssetSource(assetModule).uri;
}

function getMpdAssetModule(bundleId: string): number {
  const assetModule = MPD_ASSET_MODULES[bundleId as BuildGuideBundleId];
  if (assetModule == null) {
    throw new Error(
      `Unknown build guide bundle "${bundleId}". Register it in MPD_ASSET_MODULES (bundles.ts). Known bundles: ${BUILD_GUIDE_BUNDLE_IDS.join(
        ', ',
      )}`,
    );
  }

  return assetModule;
}
