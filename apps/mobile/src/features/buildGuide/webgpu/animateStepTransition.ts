import * as THREE from 'three';

import type { StepAnimationMode } from '../settings/types';

export type InstructionPose = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  zoom: number;
};

const _oldPos = new THREE.Vector3();
const _oldQuat = new THREE.Quaternion();
const _newPos = new THREE.Vector3();
const _newQuat = new THREE.Quaternion();
const _tmpQuat = new THREE.Quaternion();

/**
 * BI.js 公式：rotationMS = (2-mode)*300，positionMS = (2-mode)*150
 * 先旋转，再位移+zoom。
 */
export function getStepAnimationDurations(mode: StepAnimationMode): {
  rotationMs: number;
  positionMs: number;
  totalMs: number;
} {
  const rotationMs = (2 - mode) * 300;
  const positionMs = (2 - mode) * 150;
  return { rotationMs, positionMs, totalMs: rotationMs + positionMs };
}

export function captureInstructionPose(
  root: THREE.Object3D,
  camera: THREE.OrthographicCamera,
): InstructionPose {
  return {
    position: root.position.clone(),
    quaternion: root.quaternion.clone(),
    zoom: camera.zoom,
  };
}

export function applyInstructionPose(
  root: THREE.Object3D,
  camera: THREE.OrthographicCamera,
  pose: InstructionPose,
): void {
  root.position.copy(pose.position);
  root.quaternion.copy(pose.quaternion);
  root.updateMatrixWorld(true);
  camera.zoom = pose.zoom;
  camera.updateProjectionMatrix();
}

/**
 * 返回 cancel 函数。mode=2 或 totalMs=0 时立即 finalize。
 */
export function animateInstructionTransition(
  root: THREE.Object3D,
  camera: THREE.OrthographicCamera,
  from: InstructionPose,
  to: InstructionPose,
  mode: StepAnimationMode,
  onDone?: () => void,
): () => void {
  const { rotationMs, positionMs, totalMs } = getStepAnimationDurations(mode);
  const rotationChanges = from.quaternion.angleTo(to.quaternion) > 1e-4;
  const positionChanges =
    from.position.distanceTo(to.position) > 1e-3 ||
    Math.abs(from.zoom - to.zoom) > 1e-4;

  const rotMs = rotationChanges ? rotationMs : 0;
  const posMs = positionChanges ? positionMs : 0;
  const duration = rotMs + posMs;

  if (mode === 2 || duration <= 0 || totalMs <= 0) {
    applyInstructionPose(root, camera, to);
    onDone?.();
    return () => undefined;
  }

  let raf = 0;
  let cancelled = false;
  const start = Date.now();

  _oldPos.copy(from.position);
  _oldQuat.copy(from.quaternion);
  _newPos.copy(to.position);
  _newQuat.copy(to.quaternion);

  const tick = () => {
    if (cancelled) {
      return;
    }
    const elapsed = Date.now() - start;
    if (elapsed >= duration) {
      applyInstructionPose(root, camera, to);
      onDone?.();
      return;
    }

    if (elapsed < rotMs) {
      const t = Math.min(1, (elapsed / rotMs) * 1.1);
      _tmpQuat
        .copy(_oldQuat)
        .rotateTowards(_newQuat, _oldQuat.angleTo(_newQuat) * t);
      root.quaternion.copy(_tmpQuat);
      root.position.copy(_oldPos);
      camera.zoom = from.zoom;
    } else {
      root.quaternion.copy(_newQuat);
      const t = posMs > 0 ? Math.min(1, (elapsed - rotMs) / posMs) : 1;
      root.position.lerpVectors(_oldPos, _newPos, t);
      camera.zoom = from.zoom + (to.zoom - from.zoom) * t;
    }

    root.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
