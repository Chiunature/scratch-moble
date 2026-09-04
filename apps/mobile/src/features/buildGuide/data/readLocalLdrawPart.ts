import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { buildLocalPartCandidates } from '@scratch-mobile/ldr-engine';
import partIndex from '../../../../assets/ldraw/part-index.json';
import { readTextFile } from '../../../utils/blobFs';

const LOCAL_ROOTS =
  Platform.OS === 'android'
    ? ['ldraw']
    : [`${ReactNativeBlobUtil.fs.dirs.MainBundleDir}/ldraw`];

const INDEXED_PART_PATHS = partIndex as Record<string, string>;
const localPartCache = new Map<string, Promise<string | null>>();

async function readCandidate(path: string): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      return await readTextFile(ReactNativeBlobUtil.fs.asset(path));
    }

    return await readTextFile(path);
  } catch {
    return null;
  }
}

function normalizePartID(id: string): string {
  return id.replace(/\\/g, '/').toLowerCase();
}

function resolveIndexedCandidates(normalizedID: string): string[] | null {
  const relativePath = INDEXED_PART_PATHS[normalizedID];
  if (!relativePath) {
    return null;
  }

  return LOCAL_ROOTS.map(root => `${root}/${relativePath}`);
}

export function readLocalLdrawPart(id: string): Promise<string | null> {
  const normalizedID = normalizePartID(id);
  const cached = localPartCache.get(normalizedID);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    const candidates =
      resolveIndexedCandidates(normalizedID) ??
      buildLocalPartCandidates(normalizedID, LOCAL_ROOTS);

    for (const candidate of candidates) {
      const text = await readCandidate(candidate);
      if (text != null) {
        return text;
      }
    }

    return null;
  })();

  localPartCache.set(normalizedID, request);
  return request;
}
