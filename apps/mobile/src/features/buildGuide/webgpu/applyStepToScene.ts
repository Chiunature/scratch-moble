import type { PerspectiveCamera } from 'three';
import * as THREE from 'three';

import type { BuildGuideStep } from '../types';

export function applyStepToScene(
  camera: PerspectiveCamera,
  step: BuildGuideStep | undefined,
  stepIndex: number,
): void {
  if (step?.camera) {
    const [x, y, z] = step.camera.position;
    const [tx, ty, tz] = step.camera.target;
    camera.position.set(x, y, z);
    camera.lookAt(tx, ty, tz);
    return;
  }

  const angle = stepIndex * 0.28;
  const radius = 2.2;
  camera.position.set(
    Math.sin(angle) * radius,
    0.35 + stepIndex * 0.03,
    Math.cos(angle) * radius,
  );
  camera.lookAt(0, 0, 0);
}

export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry.dispose();

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      material.dispose();
    }
  });
}
