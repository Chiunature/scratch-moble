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

/** 单帧最多推进这么多，避免 bake/React 卡住后首帧 elapsed 暴涨导致“突然冲”。 */
const MAX_FRAME_DELTA_MS = 1000 / 30;

/**
 * BI.js 时长公式：rotationMS = (2-mode)*300，positionMS = (2-mode)*150。
 * 并行时统一用较长的 rotationMs，保证纯 reframing 也有足够时间。
 */
export function getStepAnimationDurations(mode: StepAnimationMode): {
  rotationMs: number;
  positionMs: number;
  totalMs: number;
} {
  const rotationMs = (2 - mode) * 300;
  const positionMs = (2 - mode) * 150;
  return {
    rotationMs,
    positionMs,
    totalMs: rotationMs,
  };
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

function applyInterpolatedPose(
  root: THREE.Object3D,
  camera: THREE.OrthographicCamera,
  from: InstructionPose,
  to: InstructionPose,
  t: number,
  rotationChanges: boolean,
  positionChanges: boolean,
): void {
  if (rotationChanges) {
    root.quaternion.copy(_oldQuat).slerp(_newQuat, t);
  } else {
    root.quaternion.copy(_newQuat);
  }

  if (positionChanges) {
    root.position.lerpVectors(_oldPos, _newPos, t);
    // 缩小（zoom 变小）时略提前完成，减少“画面闷很久才突然拉开”的感觉。
    const zoomT =
      to.zoom < from.zoom - 1e-6 ? Math.min(1, t * 1.35) : t;
    camera.zoom = from.zoom + (to.zoom - from.zoom) * zoomT;
  } else {
    root.position.copy(_newPos);
    camera.zoom = to.zoom;
  }

  root.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
}

/**
 * 返回 cancel 函数。mode=2 或 duration=0 时立即 finalize。
 * 旋转与位移/zoom 并行；用累计进度 + 帧间隔上限，避免主线程卡顿后时间跳跃。
 */
export function animateInstructionTransition(
  root: THREE.Object3D,
  camera: THREE.OrthographicCamera,
  from: InstructionPose,
  to: InstructionPose,
  mode: StepAnimationMode,
  onDone?: () => void,
  onFrame?: () => void,
): () => void {
  const { rotationMs, totalMs } = getStepAnimationDurations(mode);
  const rotationChanges = from.quaternion.angleTo(to.quaternion) > 1e-4;
  const positionChanges =
    from.position.distanceTo(to.position) > 1e-3 ||
    Math.abs(from.zoom - to.zoom) > 1e-4;

  const duration =
    rotationChanges || positionChanges ? Math.max(rotationMs, 1) : 0;

  if (mode === 2 || duration <= 0 || totalMs <= 0) {
    applyInstructionPose(root, camera, to);
    onFrame?.();
    onDone?.();
    return () => undefined;
  }

  let raf = 0;
  let cancelled = false;
  let lastNow: number | null = null;
  let progress = 0;

  _oldPos.copy(from.position);
  _oldQuat.copy(from.quaternion);
  _newPos.copy(to.position);
  _newQuat.copy(to.quaternion);

  const tick = (now: number) => {
    if (cancelled) {
      return;
    }

    if (lastNow == null) {
      // 第一帧只标定时钟并画 t=0，不把“等到首帧”的空等算进动画。
      lastNow = now;
      applyInterpolatedPose(
        root,
        camera,
        from,
        to,
        0,
        rotationChanges,
        positionChanges,
      );
      onFrame?.();
      raf = requestAnimationFrame(tick);
      return;
    }

    const delta = Math.min(now - lastNow, MAX_FRAME_DELTA_MS);
    lastNow = now;
    progress = Math.min(1, progress + delta / duration);

    if (progress >= 1) {
      applyInstructionPose(root, camera, to);
      onFrame?.();
      onDone?.();
      return;
    }

    applyInterpolatedPose(
      root,
      camera,
      from,
      to,
      progress,
      rotationChanges,
      positionChanges,
    );
    onFrame?.();
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
