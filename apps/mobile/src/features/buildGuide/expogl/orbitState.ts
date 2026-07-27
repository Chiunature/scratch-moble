import * as THREE from 'three';

export const ORBIT_EPSILON = 0.000001;

const ORBIT_DAMPING = 0.28;

const _orbitOffset = new THREE.Vector3();
const _orbitUp = new THREE.Vector3(0, 1, 0);
const _orbitQuat = new THREE.Quaternion();
const _orbitQuatInverse = new THREE.Quaternion();
const _orbitSpherical = new THREE.Spherical();

export type OrbitState = {
  theta: number;
  phi: number;
  radius: number;
  zoom: number;
  thetaDelta: number;
  phiDelta: number;
};

export function createOrbitState(): OrbitState {
  return {
    theta: 0,
    phi: Math.PI / 2,
    radius: 1,
    zoom: 1,
    thetaDelta: 0,
    phiDelta: 0,
  };
}

export function captureOrbitFromCamera(
  camera: THREE.Camera,
  target: THREE.Vector3,
): OrbitState {
  _orbitQuat.setFromUnitVectors(camera.up, _orbitUp);
  _orbitOffset.copy(camera.position).sub(target).applyQuaternion(_orbitQuat);
  _orbitSpherical.setFromVector3(_orbitOffset);

  const zoom = camera instanceof THREE.OrthographicCamera ? camera.zoom : 1;

  return {
    theta: _orbitSpherical.theta,
    phi: _orbitSpherical.phi,
    radius: Math.max(ORBIT_EPSILON, _orbitSpherical.radius),
    zoom,
    thetaDelta: 0,
    phiDelta: 0,
  };
}

function hasOrbitInertia(orbit: OrbitState): boolean {
  return (
    Math.abs(orbit.thetaDelta) > ORBIT_EPSILON ||
    Math.abs(orbit.phiDelta) > ORBIT_EPSILON
  );
}

export function applyOrbitDamping(orbit: OrbitState): boolean {
  if (!hasOrbitInertia(orbit)) {
    orbit.thetaDelta = 0;
    orbit.phiDelta = 0;
    return false;
  }

  orbit.theta += orbit.thetaDelta * ORBIT_DAMPING;
  orbit.phi += orbit.phiDelta * ORBIT_DAMPING;
  orbit.phi = clamp(orbit.phi, ORBIT_EPSILON, Math.PI - ORBIT_EPSILON);
  orbit.thetaDelta *= 1 - ORBIT_DAMPING;
  orbit.phiDelta *= 1 - ORBIT_DAMPING;

  if (!hasOrbitInertia(orbit)) {
    orbit.thetaDelta = 0;
    orbit.phiDelta = 0;
  }

  return true;
}

export function applyOrbitToCamera(
  camera: THREE.Camera,
  target: THREE.Vector3,
  orbit: OrbitState,
): void {
  _orbitQuat.setFromUnitVectors(camera.up, _orbitUp);
  _orbitQuatInverse.copy(_orbitQuat).invert();

  _orbitSpherical.theta = orbit.theta;
  _orbitSpherical.phi = clamp(orbit.phi, ORBIT_EPSILON, Math.PI - ORBIT_EPSILON);
  _orbitSpherical.radius = orbit.radius;
  _orbitOffset.setFromSpherical(_orbitSpherical).applyQuaternion(_orbitQuatInverse);

  camera.position.copy(target).add(_orbitOffset);
  camera.lookAt(target);

  if (camera instanceof THREE.OrthographicCamera) {
    camera.zoom = Math.max(ORBIT_EPSILON, orbit.zoom);
    camera.updateProjectionMatrix();
  } else if (camera instanceof THREE.PerspectiveCamera) {
    camera.updateProjectionMatrix();
  }

  updateCameraMatrix(camera);
}

function updateCameraMatrix(camera: THREE.Camera): void {
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}