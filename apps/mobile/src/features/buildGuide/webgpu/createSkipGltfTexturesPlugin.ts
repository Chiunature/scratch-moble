import * as THREE from 'three';

function createPlaceholderTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array([255, 204, 0, 255]),
    1,
    1,
  );
  texture.needsUpdate = true;
  return texture;
}

export function createSkipGltfTexturesPlugin() {
  return function skipGltfTexturesPlugin() {
    return {
      name: 'RN_SKIP_GLTF_TEXTURES',
      loadTexture(_textureIndex: number) {
        return Promise.resolve(createPlaceholderTexture());
      },
    };
  };
}
