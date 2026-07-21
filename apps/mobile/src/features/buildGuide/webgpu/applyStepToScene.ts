import * as THREE from 'three';

import {
  LdrMeasurer,
  type LdrDisplayMode,
  type LdrStepHandlerFacade,
} from '@scratch-mobile/ldr-engine';

import type { BuildGuideStep } from '../types';

type ViewportSize = { width: number; height: number };
type StepCamera = NonNullable<BuildGuideStep['camera']>;

const _defaultMatrix = new THREE.Matrix4();
const _rotationMatrix = new THREE.Matrix4();
const _boxSize = new THREE.Vector3();
const _boxCenter = new THREE.Vector3();

function isProjectionCamera(
  camera: THREE.Camera,
): camera is THREE.PerspectiveCamera | THREE.OrthographicCamera {
  return (
    camera instanceof THREE.PerspectiveCamera ||
    camera instanceof THREE.OrthographicCamera
  );
}

/**
 * 说明书每步始终用累计包围盒居中 + fit。
 *
 * 不根据「当前步零件更小」自动切到 step bounds：
 * 那种比例策略会把大量正常步骤误判成局部放大。
 * viewport 只参与相机 frustum，不参与取景决策，保证跨设备一致。
 */
function selectBounds(
  stepHandler: LdrStepHandlerFacade,
): { bounds: THREE.Box3; useAccumulated: boolean } {
  return {
    bounds: stepHandler.getAccumulatedBounds().clone(),
    useAccumulated: true,
  };
}

function updateInstructionCamera(
  camera: THREE.OrthographicCamera,
  stepHandler: LdrStepHandlerFacade,
  viewport: ViewportSize,
): void {
  const w = viewport.width * 0.95;
  const h = viewport.height * 0.95;

  camera.left = -w;
  camera.right = w;
  camera.top = h;
  camera.bottom = -h;

  const accBounds = stepHandler.getAccumulatedBounds();
  const size = accBounds.min.distanceTo(accBounds.max) || 1000;
  // 相机距原点约 15.78*size；先给一个合理 near/far，stabilize 还会按包围盒再收紧
  const distance = 15.7797 * size;

  camera.position.set(10 * size, 7 * size, 10 * size);
  camera.near = Math.max(0.1, distance * 0.01);
  camera.far = distance * 4;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function updatePerspectiveCamera(
  camera: THREE.Camera,
  viewport?: ViewportSize,
): void {
  if (!(camera instanceof THREE.PerspectiveCamera) || !viewport?.height) {
    return;
  }

  camera.aspect = viewport.width / viewport.height;
  camera.updateProjectionMatrix();
}

function applyStepCamera(
  camera: THREE.Camera,
  stepCamera: StepCamera,
  viewport?: ViewportSize,
): void {
  updatePerspectiveCamera(camera, viewport);

  const [x, y, z] = stepCamera.position;
  const [tx, ty, tz] = stepCamera.target;
  camera.position.set(x, y, z);
  camera.lookAt(tx, ty, tz);
}

function applyPreviewStepToScene(
  camera: THREE.Camera,
  root: THREE.Object3D,
  viewport?: ViewportSize,
): void {
  updatePerspectiveCamera(camera, viewport);

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  box.getCenter(_boxCenter);
  box.getSize(_boxSize);

  const maxDim = Math.max(_boxSize.x, _boxSize.y, _boxSize.z) || 1;
  const distance =
    camera instanceof THREE.PerspectiveCamera
      ? maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
      : maxDim * 2.4;

  camera.position.set(
    _boxCenter.x + distance,
    _boxCenter.y + distance * 0.7,
    _boxCenter.z + distance,
  );
  if (isProjectionCamera(camera)) {
    camera.near = 0.01;
    camera.far = Math.max(1000, distance * 8);
  }
  camera.lookAt(_boxCenter);

  if (isProjectionCamera(camera)) {
    camera.updateProjectionMatrix();
  }
}

export function applyStepToScene(
  camera: THREE.Camera,
  root: THREE.Object3D,
  step: BuildGuideStep | undefined,
  stepIndex: number,
  stepHandler?: LdrStepHandlerFacade | null,
  viewport?: ViewportSize,
  mode: LdrDisplayMode = 'instruction',
): void {
  if (
    mode === 'instruction' &&
    camera instanceof THREE.OrthographicCamera &&
    stepHandler &&
    viewport
  ) {
    applyInstructionStepToScene(camera, root, stepHandler, viewport);
    return;
  }
  if (step?.camera) {
    applyStepCamera(camera, step.camera, viewport);
    return;
  }

  if (mode === 'preview') {
    applyPreviewStepToScene(camera, root, viewport);
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
      // Bounds may be unavailable during early loading; fall through.
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
  stepHandler: LdrStepHandlerFacade,
  viewport: ViewportSize,
): void {
  updateInstructionCamera(camera, stepHandler, viewport);

  const { bounds, useAccumulated } = selectBounds(stepHandler);

  const [position, rotation] = stepHandler.computeCameraPositionRotation(
    _defaultMatrix,
    _rotationMatrix,
    useAccumulated,
  );

  // 必须先写完 position+rotation 再 measure，避免 zoom 与真实 matrixWorld 不一致
  root.position.copy(position);
  root.setRotationFromMatrix(rotation);
  root.updateMatrixWorld(true);

  const measurer = new LdrMeasurer(camera);
  const [dx, dy] = measurer.measure(bounds, root.matrixWorld);

  const scale = 1.1;
  const defaultZoom =
    dx * scale > dy * scale
      ? (2 * camera.zoom) / (dx * scale)
      : (2 * camera.zoom) / (dy * scale);

  camera.zoom = defaultZoom;
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
