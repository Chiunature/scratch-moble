import { Asset } from 'expo-asset';

import editorHtmlModule from '../../../assets/editor/editorBundle.html';
import { readTextFile } from '../../utils/blobFs';

/**
 * Metro packs the editor HTML as a raw asset. Load it only when the editor
 * screen mounts so the 4MB+ document stays out of the main JS module graph.
 */
let cachedHtml: string | null = null;
let loadPromise: Promise<string> | null = null;

export async function loadEditorBundleHtml(): Promise<string> {
  if (cachedHtml != null) {
    return cachedHtml;
  }
  if (loadPromise != null) {
    return loadPromise;
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
