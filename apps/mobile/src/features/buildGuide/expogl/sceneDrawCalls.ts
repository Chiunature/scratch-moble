import * as THREE from 'three';

import type { RuntimeColor, RuntimeDrawCall } from './glTypes';

const CONDITIONAL_LINE_FLAG = 'ldrConditionalLine';
const TRANSPARENT_FLAG = 'ldrTransparent';
const OPACITY_KEY = 'ldrOpacity';

const _rootMatrixWorldInverse = new THREE.Matrix4();
const _relativeMatrixWorld = new THREE.Matrix4();
const _vertex = new THREE.Vector3();
const _displayColor = new THREE.Color();

type FlattenedGeometry = {
  positions: Float32Array;
  center: readonly [number, number, number];
};

function getFirstMaterial(
  material: THREE.Material | THREE.Material[],
): THREE.Material {
  return Array.isArray(material) ? material[0] : material;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function colorToDisplayColor(
  color: THREE.Color,
  alpha: number,
): RuntimeColor {
  _displayColor.copy(color).convertLinearToSRGB();
  return [
    clamp01(_displayColor.r),
    clamp01(_displayColor.g),
    clamp01(_displayColor.b),
    clamp01(alpha),
  ];
}

function vectorToRuntimeColor(value: THREE.Vector4): RuntimeColor {
  _displayColor.setRGB(value.x, value.y, value.z).convertLinearToSRGB();
  return [
    clamp01(_displayColor.r),
    clamp01(_displayColor.g),
    clamp01(_displayColor.b),
    clamp01(value.w),
  ];
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
    return vectorToRuntimeColor(uniformValue);
  }

  if (uniformValue instanceof THREE.Color) {
    return colorToDisplayColor(uniformValue, 1);
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
    return colorToDisplayColor(color, alpha);
  }

  return [0.5, 0.5, 0.5, clamp01(alpha)];
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

function resolvePolygonOffset(
  material: THREE.Material,
  mode: RuntimeDrawCall['mode'],
): readonly [number, number] | null {
  if (mode !== 'triangles') {
    return null;
  }

  const offset = material as THREE.Material & {
    polygonOffset?: boolean;
    polygonOffsetFactor?: number;
    polygonOffsetUnits?: number;
  };
  if (!offset.polygonOffset) {
    return null;
  }

  return [offset.polygonOffsetFactor ?? 1, offset.polygonOffsetUnits ?? 1];
}

function flattenGeometryPositions(
  geometry: THREE.BufferGeometry,
  matrixWorld: THREE.Matrix4,
): FlattenedGeometry | null {
  const position = geometry.getAttribute('position');
  if (!position || position.count === 0) {
    return null;
  }

  const index = geometry.index;
  const count = index ? index.count : position.count;
  const positions = new Float32Array(count * 3);
  let centerX = 0;
  let centerY = 0;
  let centerZ = 0;

  for (let i = 0; i < count; i += 1) {
    const sourceIndex = index ? index.getX(i) : i;
    _vertex.fromBufferAttribute(position, sourceIndex).applyMatrix4(matrixWorld);
    const target = i * 3;
    positions[target] = _vertex.x;
    positions[target + 1] = _vertex.y;
    positions[target + 2] = _vertex.z;
    centerX += _vertex.x;
    centerY += _vertex.y;
    centerZ += _vertex.z;
  }

  const invCount = 1 / count;
  return {
    positions,
    center: [centerX * invCount, centerY * invCount, centerZ * invCount],
  };
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

    const flattened = flattenGeometryPositions(
      object.geometry,
      _relativeMatrixWorld.multiplyMatrices(
        _rootMatrixWorldInverse,
        object.matrixWorld,
      ),
    );
    if (!flattened || flattened.positions.length === 0) {
      return;
    }

    const mode = object instanceof THREE.Mesh ? 'triangles' : 'lines';
    calls.push({
      mode,
      positions: flattened.positions,
      center: flattened.center,
      color: getMaterialColor(material),
      transparent: isTransparentMaterial(material),
      polygonOffset: resolvePolygonOffset(material, mode),
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