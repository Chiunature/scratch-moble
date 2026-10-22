import { Asset } from 'expo-asset';

import editorHtmlModule from '../../../assets/editor/editorBundle.html';
import { readTextFile } from '../../utils/blobFs';

/**
 * Metro packs the editor HTML as a raw asset. Load it only when the editor
 * screen mounts so the 4MB+ document stays out of the main JS module graph.
 */
let cachedHtml: string | null = null;
let loadPromise: Promise<string> | null = null;

/** 开发期在同步 editor bundle 后可丢掉内存缓存，避免仍用旧 HTML。 */
export function clearEditorBundleHtmlCache(): void {
  cachedHtml = null;
  loadPromise = null;
}

export async function loadEditorBundleHtml(): Promise<string> {
  // Dev: always re-read after Metro reload so yarn editor:web sync is picked up.
  // Production: keep the in-memory cache for the 4MB+ document.
  if (!__DEV__ && cachedHtml != null) {
    return cachedHtml;
  }
  if (!__DEV__ && loadPromise != null) {
    return loadPromise;
  }
  if (__DEV__) {
    cachedHtml = null;
    loadPromise = null;
  }

  loadPromise = (async () => {
    const asset = Asset.fromModule(editorHtmlModule);
    await asset.downloadAsync();
    if (asset.localUri == null) {
      throw new Error('Failed to materialize editor bundle HTML asset');
    }
    const html = await readTextFile(asset.localUri);
    cachedHtml = html;
    return html;
  })();

  try {
    return await loadPromise;
  } catch (error) {
    loadPromise = null;
    throw error;
  }
}
