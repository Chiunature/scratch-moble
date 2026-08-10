import { Asset } from 'expo-asset';
import { parseMpdManifest } from '@scratch-mobile/build-guide';

import catalogJson from '../../../../assets/buildGuide/catalog.json';
import containerDemoManifest from '../../../../assets/buildGuide/models/container-demo/manifest.json';
import teslaModelSManifest from '../../../../assets/buildGuide/models/tesla-model-s/manifest.json';
import mingGreenFigureManifest from '../../../../assets/buildGuide/models/testlbs/manifest.json';
import type { BuildGuideManifest } from '../types';

/**
 * Metro requires static `require()` for bundled MPD assets.
 * Add a new entry here when introducing another build-guide model.
 */
const BUILD_GUIDE_MODELS = {
  'container-demo': {
    manifest: containerDemoManifest,
    mpd: require('../../../../assets/buildGuide/models/container-demo/build/export.mpd'),
    cover: require('../../../../assets/buildGuide/models/container-demo/container.png'),
  },
  'tesla-model-s': {
    manifest: teslaModelSManifest,
    mpd: require('../../../../assets/buildGuide/models/tesla-model-s/build/export.mpd'),
    cover: require('../../../../assets/buildGuide/models/tesla-model-s/teslaModelS.png'),
  },
  'ming-green-figure': {
    manifest: mingGreenFigureManifest,
    mpd: require('../../../../assets/buildGuide/models/testlbs/build/export.mpd'),
    cover: require('../../../../assets/buildGuide/models/testlbs/robot.png'),
  },
} as const satisfies Record<
  string,
  { manifest: unknown; mpd: number; cover: number }
>;

export type BuildGuideModelId = keyof typeof BUILD_GUIDE_MODELS;

export type BuildGuideCatalogEntry = {
  id: BuildGuideModelId;
  nameKey: string;
  cover: number;
};

export const BUILD_GUIDE_MODEL_IDS = Object.keys(
  BUILD_GUIDE_MODELS,
) as BuildGuideModelId[];

export function isBuildGuideModelId(id: string): id is BuildGuideModelId {
  return id in BUILD_GUIDE_MODELS;
}

export const BUILD_GUIDE_CATALOG: BuildGuideCatalogEntry[] =
  catalogJson.models.map(entry => {
    if (!isBuildGuideModelId(entry.id)) {
      throw new Error(
        `catalog.json references unknown model "${entry.id}". Register it in BUILD_GUIDE_MODELS (bundles.ts).`,
      );
    }
    return {
      id: entry.id,
      nameKey: entry.nameKey,
      cover: BUILD_GUIDE_MODELS[entry.id].cover,
    };
  });

export function getBuildGuideManifest(
  modelId: BuildGuideModelId,
): BuildGuideManifest {
  return parseMpdManifest(BUILD_GUIDE_MODELS[modelId].manifest);
}

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

  if (!isBuildGuideModelId(manifest.id)) {
    throw new Error(
      `Unknown build guide model "${
        manifest.id
      }". Register it in BUILD_GUIDE_MODELS (bundles.ts). Known models: ${BUILD_GUIDE_MODEL_IDS.join(
        ', ',
      )}`,
    );
  }

  const asset = Asset.fromModule(BUILD_GUIDE_MODELS[manifest.id].mpd);
  await asset.downloadAsync();

  if (asset.localUri == null) {
    throw new Error(
      `Failed to materialize MPD asset for build guide "${manifest.id}"`,
    );
  }

  return asset.localUri;
}
