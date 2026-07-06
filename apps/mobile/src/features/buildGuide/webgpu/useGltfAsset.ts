import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader';

import { createSkipGltfTexturesPlugin } from './createSkipGltfTexturesPlugin';

export type GltfAsset = GLTF;

export function useGltfAsset(uri: string | null): GltfAsset | null {
  const [gltf, setGltf] = useState<GltfAsset | null>(null);

  useEffect(() => {
    if (!uri) {
      setGltf(null);
      return;
    }

    let cancelled = false;
    const loader = new GLTFLoader();

    if (Platform.OS !== 'web') {
      loader.register(createSkipGltfTexturesPlugin());
    }

    void loader
      .loadAsync(uri)
      .then((result: GltfAsset) => {
        if (!cancelled) {
          setGltf(result);
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to load glTF asset', error);
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return gltf;
}
