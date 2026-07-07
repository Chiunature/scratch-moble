import * as THREE from 'three';

import type { LdrLoaderInstance, LdrSceneManager } from '../types';

export function createLdrSceneManager(loader: LdrLoaderInstance): LdrSceneManager {
  const baseObject = new THREE.Group();
  const opaqueObject = new THREE.Group();
  const sixteenObject = new THREE.Group();
  const transObject = new THREE.Group();

  baseObject.add(opaqueObject);
  baseObject.add(sixteenObject);
  baseObject.add(transObject);

  return {
    baseObject,
    opaqueObject,
    sixteenObject,
    transObject,
    ldrLoader: loader,
    resetSelectedObjects() {
      // Selection/outline is optional for mobile runtime.
    },
  };
}

export function centerObject(root: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
}

export function fitObjectToView(root: THREE.Object3D, targetSize = 1.2): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim > 0) {
    root.scale.multiplyScalar(targetSize / maxDim);
  }

  centerObject(root);
}
