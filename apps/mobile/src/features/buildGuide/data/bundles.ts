import { Asset } from 'expo-asset';
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

/**
 * Resolve a fetchable URI for the MPD.
 *
 * On Android release, Metro packs non-image assets into `res/raw` and
 * `Image.resolveAssetSource()` returns a bare resource name (not a URL).
 * `expo-asset` materializes that raw resource into a real `file://` path.
 */
export async function resolveMpdUri(
  manifest: BuildGuideManifest,
): Promise<string> {
  if (
    manifest.mpdUri.startsWith('http://') ||
    manifest.mpdUri.startsWith('https://')
  ) {
    return manifest.mpdUri;
  }

  const assetModule = getMpdAssetModule(manifest.id);
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();

  if (asset.localUri == null) {
    throw new Error(
      `Failed to materialize MPD asset for build guide "${manifest.id}"`,
    );
  }

  return asset.localUri;
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
