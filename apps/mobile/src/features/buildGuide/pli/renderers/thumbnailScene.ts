import { createPliPartObject, type LoadedLdrModel } from '@scratch-mobile/ldr-engine';
import * as THREE from 'three';

import type { PliThumbnailRequest } from './types';

export type PliThumbnailScene = {
  root: THREE.Group;
  camera: THREE.OrthographicCamera;
};

const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();
const _center = new THREE.Vector3();

function hasRenderableBounds(box: THREE.Box3): boolean {
  return (
    Number.isFinite(box.min.x) &&
    Number.isFinite(box.min.y) &&
    Number.isFinite(box.min.z) &&
    Number.isFinite(box.max.x) &&
    Number.isFinite(box.max.y) &&
    Number.isFinite(box.max.z) &&
    box.max.x >= box.min.x &&
    box.max.y >= box.min.y &&
    box.max.z >= box.min.z
  );
}

function createThumbnailCamera(
  root: THREE.Object3D,
  aspect: number,
): THREE.OrthographicCamera | null {
  root.updateMatrixWorld(true);
  _box.setFromObject(root);

  if (!hasRenderableBounds(_box)) {
    return null;
  }

  _box.getBoundingSphere(_sphere);
  _center.copy(_sphere.center);

  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const radius = Math.max(_sphere.radius, 1);
  const frustumHeight = radius * 2.35;
  const distance = Math.max(radius * 4, 10);
  const camera = new THREE.OrthographicCamera(
    (-frustumHeight * safeAspect) / 2,
    (frustumHeight * safeAspect) / 2,
    frustumHeight / 2,
    -frustumHeight / 2,
    0.01,
    distance + radius * 4,
  );

  camera.position.set(
    _center.x + distance,
    _center.y - distance * 1.08,
    _center.z + distance * 0.72,
  );
  camera.up.set(0, 0, 1);
  camera.lookAt(_center);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  return camera;
}

export function createPliThumbnailScene(
  model: LoadedLdrModel,
  request: PliThumbnailRequest,
): PliThumbnailScene | null {
  const root = createPliPartObject({
    loader: model.loader,
    partID: request.partID,
    colorID: request.colorID,
  });
  const camera = createThumbnailCamera(
    root,
    request.viewport.width / request.viewport.height,
  );

  if (!camera) {
    return null;
  }

  return { root, camera };
}