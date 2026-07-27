import { Platform } from 'react-native';
import * as THREE from 'three';

let applied = false;

function createPlaceholderTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array([255, 204, 0, 255]),
    1,
    1,
  );
  texture.needsUpdate = true;
  return texture;
}

function disableCreateImageBitmap(): void {
  Reflect.deleteProperty(globalThis, 'createImageBitmap');
}

export function applyThreeTextureLoaderStub(): void {
  if (applied || Platform.OS === 'web') {
    return;
  }

  applied = true;
  disableCreateImageBitmap();

  THREE.TextureLoader.prototype.load = function load(
    _url,
    onLoad,
    _onProgress,
    _onError,
  ) {
    const texture = createPlaceholderTexture();
    onLoad?.(texture);
    return texture;
  };

  THREE.ImageBitmapLoader.prototype.load = function load(
    _url,
    onLoad,
    _onProgress,
    _onError,
  ) {
    const imageBitmap = {
      width: 1,
      height: 1,
      close: () => {},
    };

    onLoad?.(imageBitmap as never);
    return imageBitmap;
  };
}