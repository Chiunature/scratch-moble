import * as THREE from 'three';

import type { LdrStepHandlerFacade } from '@scratch-mobile/ldr-engine';

import type { BuildGuideStep } from '../types';

type ViewportSize = {
  width: number;
  height: number;
};

const ORTHOGRAPHIC_CAMERA_DISTANCE = 10;
const ORTHOGRAPHIC_FIT_PADDING = 0.82;

export function applyStepToScene(
  camera: THREE.Camera,
  root: THREE.Object3D,
  step: BuildGuideStep | undefined,
  stepIndex: number,
  stepHandler?: LdrStepHandlerFacade | null,
  viewport?: ViewportSize,
): void {
  if (camera instanceof THREE.OrthographicCamera) {
    applyInstructionStepToScene(camera, root, stepHandler, viewport);
    return;
  }

  if (step?.camera) {
    const [x, y, z] = step.camera.position;
    const [tx, ty, tz] = step.camera.target;
    camera.position.set(x, y, z);
    camera.lookAt(tx, ty, tz);
    return;
  }

  if (stepHandler) {
    try {
      const defaultMatrix = new THREE.Matrix4();
      const rotationMatrix = new THREE.Matrix4();
      const [offset, rotation] = stepHandler.computeCameraPositionRotation(
        defaultMatrix,
        rotationMatrix,
        true,
      );

      const target = new THREE.Vector3();
      stepHandler.getAccumulatedBounds().getCenter(target);

      const distance = 2.4;
      const direction = new THREE.Vector3(0, 0.2, distance).applyMatrix4(
        rotation,
      );
      camera.position
        .copy(target)
        .add(direction)
        .add(offset.multiplyScalar(0.001));
      camera.lookAt(target);
      return;
    } catch {
      // Fall through to heuristic camera when step handler has no bounds yet.
    }
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

function applyInstructionStepToScene(
  camera: THREE.OrthographicCamera,
  root: THREE.Object3D,
  stepHandler?: LdrStepHandlerFacade | null,
  viewport?: ViewportSize,
): void {
  const aspect =
    viewport && viewport.height > 0 ? viewport.width / viewport.height : 1;
  camera.left = -aspect;
  camera.right = aspect;
  camera.top = 1;
  camera.bottom = -1;
  camera.near = 0.01;
  camera.far = 1000;
  camera.position.set(
    ORTHOGRAPHIC_CAMERA_DISTANCE,
    ORTHOGRAPHIC_CAMERA_DISTANCE * 0.7,
    ORTHOGRAPHIC_CAMERA_DISTANCE,
  );
  camera.lookAt(0, 0, 0);

  root.position.set(0, 0, 0);

  if (stepHandler) {
    try {
      const [, rotation] = stepHandler.computeCameraPositionRotation(
        new THREE.Matrix4(),
        new THREE.Matrix4(),
        true,
      );
      root.setRotationFromMatrix(rotation);
    } catch {
      root.rotation.set(0, 0, 0);
    }
  }

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);

  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    root.updateMatrixWorld(true);

    const fittedBox = new THREE.Box3().setFromObject(root);
    const size = fittedBox.getSize(new THREE.Vector3());
    const zoomX =
      size.x > 0 ? (2 * aspect * ORTHOGRAPHIC_FIT_PADDING) / size.x : Infinity;
    const zoomY =
      size.y > 0 ? (2 * ORTHOGRAPHIC_FIT_PADDING) / size.y : Infinity;
    const zoom = Math.min(zoomX, zoomY);

    if (Number.isFinite(zoom) && zoom > 0) {
      camera.zoom = zoom;
    }
  }

  camera.updateProjectionMatrix();
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
