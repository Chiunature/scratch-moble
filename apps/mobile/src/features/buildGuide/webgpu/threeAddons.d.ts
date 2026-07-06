declare module 'three/addons/loaders/GLTFLoader' {
  import type { LoadingManager, Group, AnimationClip, Camera } from 'three';
  import type { GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';

  export interface GLTF {
    animations: AnimationClip[];
    scene: Group;
    scenes: Group[];
    cameras: Camera[];
    asset: Record<string, unknown>;
    parser: GLTFParser;
    userData: Record<string, unknown>;
  }

  export class GLTFLoader {
    constructor(manager?: LoadingManager);
    register(callback: (parser: GLTFParser) => unknown): this;
    loadAsync(url: string): Promise<GLTF>;
  }
}
