import { Asset } from 'expo-asset';
import ReactNativeBlobUtil from 'react-native-blob-util';

import editorHtmlModule from '../../../assets/editor/editorBundle.html';

/**
 * Metro packs the editor HTML as a raw asset. Load it only when the editor
 * screen mounts so the 4MB+ document stays out of the main JS module graph.
 */
let cachedHtml: string | null = null;
let loadPromise: Promise<string> | null = null;

function toFilesystemPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

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
    const html = await ReactNativeBlobUtil.fs.readFile(
      toFilesystemPath(asset.localUri),
      'utf8',
    );
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
