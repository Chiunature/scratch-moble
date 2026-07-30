import * as THREE from 'three';

import {
  CONDITIONAL_FLOATS_PER_VERTEX,
  countConditionalVertices,
} from './glConditionalLayout';
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

type FlattenedGeometryCacheEntry = {
  geometry: THREE.BufferGeometry;
  position: unknown;
  index: THREE.BufferAttribute | null;
  positionVersion: number;
  indexVersion: number;
  positionCount: number;
  indexCount: number;
  matrixElements: number[];
  flattened: FlattenedGeometry;
};

type FlattenedConditionalCacheEntry = {
  geometry: THREE.BufferGeometry;
  position: unknown;
  p2: unknown;
  p3: unknown;
  p4: unknown;
  positionVersion: number;
  p2Version: number;
  p3Version: number;
  p4Version: number;
  positionCount: number;
  matrixElements: number[];
  flattened: FlattenedGeometry;
};

const MATRIX_CACHE_EPSILON = 1e-9;
const _flattenedGeometryCache = new WeakMap<
  THREE.Object3D,
  FlattenedGeometryCacheEntry
>();
const _flattenedConditionalCache = new WeakMap<
  THREE.Object3D,
  FlattenedConditionalCacheEntry
>();

function getFirstMaterial(
  material: THREE.Material | THREE.Material[],
): THREE.Material {
  return Array.isArray(material) ? material[0] : material;
}

function getAttributeVersion(attribute: unknown): number {
  const version = (attribute as { version?: unknown } | null)?.version;
  return typeof version === 'number' ? version : 0;
}

function getAttributeCount(attribute: unknown): number {
  const count = (attribute as { count?: unknown } | null)?.count;
  return typeof count === 'number' ? count : 0;
}

function matrixElementsAlmostEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (Math.abs(left[index] - right[index]) > MATRIX_CACHE_EPSILON) {
      return false;
    }
  }

  return true;
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

function flattenObjectGeometryPositions(
  object: THREE.Mesh | THREE.Line,
  matrixWorld: THREE.Matrix4,
): FlattenedGeometry | null {
  const geometry = object.geometry;
  const position = geometry.getAttribute('position');
  if (!position || position.count === 0) {
    _flattenedGeometryCache.delete(object);
    return null;
  }

  const index = geometry.index;
  const positionVersion = getAttributeVersion(position);
  const indexVersion = getAttributeVersion(index);
  const positionCount = getAttributeCount(position);
  const indexCount = getAttributeCount(index);
  const cached = _flattenedGeometryCache.get(object);
  if (
    cached &&
    cached.geometry === geometry &&
    cached.position === position &&
    cached.index === index &&
    cached.positionVersion === positionVersion &&
    cached.indexVersion === indexVersion &&
    cached.positionCount === positionCount &&
    cached.indexCount === indexCount &&
    matrixElementsAlmostEqual(cached.matrixElements, matrixWorld.elements)
  ) {
    return cached.flattened;
  }

  const flattened = flattenGeometryPositions(geometry, matrixWorld);
  if (!flattened) {
    _flattenedGeometryCache.delete(object);
    return null;
  }

  _flattenedGeometryCache.set(object, {
    geometry,
    position,
    index,
    positionVersion,
    indexVersion,
    positionCount,
    indexCount,
    matrixElements: [...matrixWorld.elements],
    flattened,
  });

  return flattened;
}

function writeTransformedAttribute(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: number,
  matrixWorld: THREE.Matrix4,
  target: Float32Array,
  offset: number,
): void {
  _vertex.fromBufferAttribute(attribute, index).applyMatrix4(matrixWorld);
  target[offset] = _vertex.x;
  target[offset + 1] = _vertex.y;
  target[offset + 2] = _vertex.z;
}

function flattenConditionalLineGeometry(
  geometry: THREE.BufferGeometry,
  matrixWorld: THREE.Matrix4,
): FlattenedGeometry | null {
  const position = geometry.getAttribute('position');
  const p2 = geometry.getAttribute('p2');
  const p3 = geometry.getAttribute('p3');
  const p4 = geometry.getAttribute('p4');
  if (
    !position ||
    !p2 ||
    !p3 ||
    !p4 ||
    position.count === 0 ||
    p2.count !== position.count ||
    p3.count !== position.count ||
    p4.count !== position.count
  ) {
    return null;
  }

  const count = position.count;
  const positions = new Float32Array(count * CONDITIONAL_FLOATS_PER_VERTEX);
  let centerX = 0;
  let centerY = 0;
  let centerZ = 0;

  for (let i = 0; i < count; i += 1) {
    const base = i * CONDITIONAL_FLOATS_PER_VERTEX;
    writeTransformedAttribute(position, i, matrixWorld, positions, base);
    writeTransformedAttribute(p2, i, matrixWorld, positions, base + 3);
    writeTransformedAttribute(p3, i, matrixWorld, positions, base + 6);
    writeTransformedAttribute(p4, i, matrixWorld, positions, base + 9);
    centerX += positions[base];
    centerY += positions[base + 1];
    centerZ += positions[base + 2];
  }

  const invCount = 1 / count;
  return {
    positions,
    center: [centerX * invCount, centerY * invCount, centerZ * invCount],
  };
}

function flattenObjectConditionalLineGeometry(
  object: THREE.Line,
  matrixWorld: THREE.Matrix4,
): FlattenedGeometry | null {
  const geometry = object.geometry;
  const position = geometry.getAttribute('position');
  const p2 = geometry.getAttribute('p2');
  const p3 = geometry.getAttribute('p3');
  const p4 = geometry.getAttribute('p4');
  if (!position || !p2 || !p3 || !p4 || position.count === 0) {
    _flattenedConditionalCache.delete(object);
    return null;
  }

  const positionVersion = getAttributeVersion(position);
  const p2Version = getAttributeVersion(p2);
  const p3Version = getAttributeVersion(p3);
  const p4Version = getAttributeVersion(p4);
  const positionCount = getAttributeCount(position);
  const cached = _flattenedConditionalCache.get(object);
  if (
    cached &&
    cached.geometry === geometry &&
    cached.position === position &&
    cached.p2 === p2 &&
    cached.p3 === p3 &&
    cached.p4 === p4 &&
    cached.positionVersion === positionVersion &&
    cached.p2Version === p2Version &&
    cached.p3Version === p3Version &&
    cached.p4Version === p4Version &&
    cached.positionCount === positionCount &&
    matrixElementsAlmostEqual(cached.matrixElements, matrixWorld.elements)
  ) {
    return cached.flattened;
  }

  const flattened = flattenConditionalLineGeometry(geometry, matrixWorld);
  if (!flattened) {
    _flattenedConditionalCache.delete(object);
    return null;
  }

  _flattenedConditionalCache.set(object, {
    geometry,
    position,
    p2,
    p3,
    p4,
    positionVersion,
    p2Version,
    p3Version,
    p4Version,
    positionCount,
    matrixElements: [...matrixWorld.elements],
    flattened,
  });

  return flattened;
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
    if (!material.visible) {
      return;
    }

    const relativeMatrix = _relativeMatrixWorld.multiplyMatrices(
      _rootMatrixWorldInverse,
      object.matrixWorld,
    );

    if (isConditionalLine(object, material)) {
      if (!(object instanceof THREE.Line)) {
        return;
      }

      const flattened = flattenObjectConditionalLineGeometry(
        object,
        relativeMatrix,
      );
      if (!flattened || flattened.positions.length === 0) {
        return;
      }

      calls.push({
        mode: 'conditional-lines',
        positions: flattened.positions,
        center: flattened.center,
        color: getMaterialColor(material),
        transparent: false,
        polygonOffset: null,
      });
      return;
    }

    const flattened = flattenObjectGeometryPositions(object, relativeMatrix);
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
  const opaqueTriangles: RuntimeDrawCall[] = [];
  const transparentTriangles: RuntimeDrawCall[] = [];
  const lines: RuntimeDrawCall[] = [];
  const conditionalLines: RuntimeDrawCall[] = [];

  for (const call of calls) {
    if (call.mode === 'conditional-lines') {
      conditionalLines.push(call);
    } else if (call.mode === 'lines') {
      lines.push(call);
    } else if (call.transparent) {
      transparentTriangles.push(call);
    } else {
      opaqueTriangles.push(call);
    }
  }

  return [
    ...opaqueTriangles,
    ...transparentTriangles,
    ...lines,
    ...conditionalLines,
  ];
}

export function countRuntimeDrawCallVertices(
  drawCalls: RuntimeDrawCall[],
): number {
  return drawCalls.reduce((sum, call) => {
    if (call.mode === 'conditional-lines') {
      return sum + countConditionalVertices(call.positions);
    }
    return sum + call.positions.length / 3;
  }, 0);
}