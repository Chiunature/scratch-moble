import * as THREE from 'three';

import type { RuntimeColor, RuntimeDrawCall } from './glTypes';

const CONDITIONAL_LINE_FLAG = 'ldrConditionalLine';
const TRANSPARENT_FLAG = 'ldrTransparent';
const OPACITY_KEY = 'ldrOpacity';

const _rootMatrixWorldInverse = new THREE.Matrix4();
const _relativeMatrixWorld = new THREE.Matrix4();
const _vertex = new THREE.Vector3();

function getFirstMaterial(
  material: THREE.Material | THREE.Material[],
): THREE.Material {
  return Array.isArray(material) ? material[0] : material;
}

function getMaterialUniformColor(
  material: THREE.Material,
): RuntimeColor | null {
  const uniformValue = (
    material as THREE.Material & {
      uniforms?: { color?: { value?: unknown } };
    }
  ).uniforms?.color?.value;

  if (uniformValue instanceof THREE.Vector4) {
    return [uniformValue.x, uniformValue.y, uniformValue.z, uniformValue.w];
  }

  if (uniformValue instanceof THREE.Color) {
    return [uniformValue.r, uniformValue.g, uniformValue.b, 1];
  }

  return null;
}

function resolveMaterialOpacity(material: THREE.Material): number {
  const stored = material.userData?.[OPACITY_KEY];
  if (typeof stored === 'number' && stored > 0 && stored <= 1) {
    return stored;
  }

  const opacity = (material as THREE.Material & { opacity?: number }).opacity;
  if (typeof opacity === 'number') {
    return opacity;
  }

  const uniformColor = getMaterialUniformColor(material);
  return uniformColor?.[3] ?? 1;
}

function getMaterialColor(material: THREE.Material): RuntimeColor {
  const uniformColor = getMaterialUniformColor(material);
  if (uniformColor) {
    return uniformColor;
  }

  const color = (material as THREE.Material & { color?: THREE.Color }).color;
  const alpha = resolveMaterialOpacity(material);
  if (color instanceof THREE.Color) {
    return [color.r, color.g, color.b, alpha];
  }

  return [0.5, 0.5, 0.5, alpha];
}

function isTransparentMaterial(material: THREE.Material): boolean {
  return Boolean(
    material.userData?.[TRANSPARENT_FLAG] ||
      material.transparent ||
      resolveMaterialOpacity(material) < 0.999,
  );
}

function isConditionalLine(
  object: THREE.Object3D,
  material: THREE.Material,
): boolean {
  return Boolean(
    object.userData?.[CONDITIONAL_LINE_FLAG] ||
      material.userData?.[CONDITIONAL_LINE_FLAG],
  );
}

function hasRenderableScale(object: THREE.Object3D): boolean {
  return (
    Math.abs(object.scale.x) > 1e-6 &&
    Math.abs(object.scale.y) > 1e-6 &&
    Math.abs(object.scale.z) > 1e-6
  );
}

function flattenGeometryPositions(
  geometry: THREE.BufferGeometry,
  matrixWorld: THREE.Matrix4,
): Float32Array | null {
  const position = geometry.getAttribute('position');
  if (!position || position.count === 0) {
    return null;
  }

  const index = geometry.index;
  const count = index ? index.count : position.count;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const sourceIndex = index ? index.getX(i) : i;
    _vertex
      .fromBufferAttribute(position, sourceIndex)
      .applyMatrix4(matrixWorld);
    const target = i * 3;
    positions[target] = _vertex.x;
    positions[target + 1] = _vertex.y;
    positions[target + 2] = _vertex.z;
  }

  return positions;
}

export function collectRuntimeDrawCalls(root: THREE.Object3D): RuntimeDrawCall[] {
  const calls: RuntimeDrawCall[] = [];

  root.updateMatrixWorld(true);
  _rootMatrixWorldInverse.copy(root.matrixWorld).invert();

  root.traverse(object => {
    if (!object.visible || !hasRenderableScale(object)) {
      return;
    }

    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line)) {
      return;
    }

    const material = getFirstMaterial(object.material);
    if (!material.visible || isConditionalLine(object, material)) {
      return;
    }

    const positions = flattenGeometryPositions(
      object.geometry,
      _relativeMatrixWorld.multiplyMatrices(
        _rootMatrixWorldInverse,
        object.matrixWorld,
      ),
    );
    if (!positions || positions.length === 0) {
      return;
    }

    calls.push({
      mode: object instanceof THREE.Mesh ? 'triangles' : 'lines',
      positions,
      color: getMaterialColor(material),
      transparent: isTransparentMaterial(material),
    });
  });

  return orderRuntimeDrawCalls(calls);
}

export function orderRuntimeDrawCalls(
  calls: RuntimeDrawCall[],
): RuntimeDrawCall[] {
  const opaqueTriangles = calls.filter(
    call => call.mode === 'triangles' && !call.transparent,
  );
  const transparentTriangles = calls.filter(
    call => call.mode === 'triangles' && call.transparent,
  );
  const lines = calls.filter(call => call.mode === 'lines');

  return [...opaqueTriangles, ...transparentTriangles, ...lines];
}