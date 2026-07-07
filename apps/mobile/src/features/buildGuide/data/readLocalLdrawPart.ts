import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { buildLocalPartCandidates } from '@scratch-mobile/ldr-engine';

const LOCAL_ROOTS =
  Platform.OS === 'android'
    ? ['ldraw']
    : [`${ReactNativeBlobUtil.fs.dirs.MainBundleDir}/ldraw`];

async function readCandidate(path: string): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      const assetUri = ReactNativeBlobUtil.fs.asset(path);
      return await ReactNativeBlobUtil.fs.readFile(assetUri, 'utf8');
    }

    return await ReactNativeBlobUtil.fs.readFile(path, 'utf8');
  } catch {
    return null;
  }
}

export async function readLocalLdrawPart(id: string): Promise<string | null> {
  const candidates = buildLocalPartCandidates(id, LOCAL_ROOTS);

  for (const candidate of candidates) {
    const text = await readCandidate(candidate);
    if (text != null) {
      return text;
    }
  }

  return null;
}
