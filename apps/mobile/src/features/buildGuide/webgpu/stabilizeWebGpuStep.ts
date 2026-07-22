/**
 * RN WebGPU 切步后的场景稳定化。
 *
 * - frustumCulled=false；按包围盒收紧 near/far
 * - 显示中零件 Mesh / Type2 边线重建材质（打断坏 pipeline，不可省略）
 * - 透明件重建为 Phong NodeMaterial，保留高光质感
 * - 面 +1 / 线 -4 polygonOffset；条件线材质保留不换
 */

import * as THREE from 'three';

const _sphere = new THREE.Sphere();
const _box = new THREE.Box3();
const _center = new THREE.Vector3();

const RUNTIME_MATERIAL_FLAG = 'ldrRuntimeMaterial';
const CONDITIONAL_LINE_FLAG = 'ldrConditionalLine';
const EDGE_LINE_FLAG = 'ldrEdgeLine';
const TRANSPARENT_FLAG = 'ldrTransparent';
const OPACITY_KEY = 'ldrOpacity';

function isScaledShown(object: THREE.Object3D): boolean {
  return (
    Math.abs(object.scale.x) > 1e-6 &&
    Math.abs(object.scale.y) > 1e-6 &&
    Math.abs(object.scale.z) > 1e-6
  );
}

function getBaseColor(material: THREE.Material): THREE.Color {
  if ('color' in material && material.color instanceof THREE.Color) {
    return material.color;
  }
  return new THREE.Color(0x808080);
}

function isTransparentMaterial(material: THREE.Material): boolean {
  if (material.userData?.[TRANSPARENT_FLAG]) {
    return true;
  }
  return material.transparent === true && (material.opacity ?? 1) < 0.999;
}

function resolveOpacity(material: THREE.Material): number {
  const stored = material.userData?.[OPACITY_KEY];
  if (typeof stored === 'number' && stored > 0 && stored <= 1) {
    return stored;
  }
  if (typeof material.opacity === 'number' && material.opacity < 1) {
    return material.opacity;
  }
  return 0.5;
}

function disposeRuntimeMaterial(
  material: THREE.Material | THREE.Material[] | undefined,
): void {
  if (!material) {
    return;
  }
  const list = Array.isArray(material) ? material : [material];
  for (const item of list) {
    if (item?.userData?.[RUNTIME_MATERIAL_FLAG]) {
      item.dispose();
    }
  }
}

function createPhongCtor():
  | (new (params?: object) => THREE.Material)
  | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webgpu = require('three/webgpu') as {
      MeshPhongNodeMaterial?: new (params?: object) => THREE.Material;
      MeshPhongMaterial?: new (params?: object) => THREE.Material;
    };
    return webgpu.MeshPhongNodeMaterial ?? webgpu.MeshPhongMaterial ?? null;
  } catch {
    return null;
  }
}

function refreshShownMeshMaterial(mesh: THREE.Mesh): void {
  const previous = Array.isArray(mesh.material)
    ? mesh.material[0]
    : mesh.material;
  if (!previous) {
    return;
  }

  const color = getBaseColor(previous).clone();
  const isTrans = isTransparentMaterial(previous);
  const opacity = isTrans ? resolveOpacity(previous) : 1;
  const polygon = {
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  };

  let next: THREE.Material;
  if (isTrans) {
    const PhongCtor = createPhongCtor();
    if (PhongCtor) {
      next = new PhongCtor({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        shininess: 100,
        specular: 0xffffff,
        ...polygon,
      });
      if ('reflectivity' in next) {
        (next as THREE.MeshPhongMaterial).reflectivity = 0.65;
      }
    } else {
      next = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        ...polygon,
      });
    }
    next.userData[TRANSPARENT_FLAG] = true;
    next.userData[OPACITY_KEY] = opacity;
  } else {
    next = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      transparent: false,
      opacity: 1,
      ...polygon,
    });
  }

  next.userData[RUNTIME_MATERIAL_FLAG] = true;

  disposeRuntimeMaterial(mesh.material);
  mesh.material = next;
  mesh.visible = true;
  mesh.scale.set(1, 1, 1);
}

function refreshShownEdgeLineMaterial(line: THREE.LineSegments): void {
  const previous = Array.isArray(line.material)
    ? line.material[0]
    : line.material;
  if (!previous) {
    return;
  }

  let NodeLine: (new (params?: object) => THREE.Material) | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webgpu = require('three/webgpu') as {
      LineBasicNodeMaterial?: new (params?: object) => THREE.Material;
    };
    NodeLine = webgpu.LineBasicNodeMaterial ?? null;
  } catch {
    NodeLine = null;
  }

  const color = getBaseColor(previous).clone();
  const next = NodeLine
    ? new NodeLine({
        color,
        depthWrite: false,
        depthTest: true,
        transparent: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      })
    : new THREE.LineBasicMaterial({
        color,
        depthWrite: false,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });
  next.userData[RUNTIME_MATERIAL_FLAG] = true;
  next.userData[EDGE_LINE_FLAG] = true;

  disposeRuntimeMaterial(line.material);
  line.material = next;
  line.visible = true;
}

function tightenCameraDepth(
  root: THREE.Object3D,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
): void {
  root.updateMatrixWorld(true);
  _box.setFromObject(root);
  if (_box.isEmpty()) {
    return;
  }

  _box.getBoundingSphere(_sphere);
  _center.copy(_sphere.center);
  const dist = camera.position.distanceTo(_center);
  const radius = Math.max(_sphere.radius, 1);
  camera.near = Math.max(0.1, dist - radius * 2);
  camera.far = dist + radius * 2;
  camera.updateProjectionMatrix();
}

/** 在 moveTo + 相机/root 变换之后调用。 */
export function stabilizeWebGpuStep(
  root: THREE.Object3D,
  camera: THREE.Camera | null,
): void {
  root.traverse(child => {
    if (child.type === 'LineSegments') {
      const line = child as THREE.LineSegments;
      line.frustumCulled = false;
      line.visible = true;

      if (line.userData?.[CONDITIONAL_LINE_FLAG]) {
        return;
      }

      if (line.userData?.[EDGE_LINE_FLAG]) {
        if (isScaledShown(line)) {
          refreshShownEdgeLineMaterial(line);
        }
        return;
      }

      line.scale.set(0, 0, 0);
      return;
    }

    if (child.type !== 'Mesh') {
      return;
    }

    const mesh = child as THREE.Mesh;
    mesh.frustumCulled = false;

    if (isScaledShown(mesh)) {
      refreshShownMeshMaterial(mesh);
    }
  });

  if (
    camera instanceof THREE.OrthographicCamera ||
    camera instanceof THREE.PerspectiveCamera
  ) {
    tightenCameraDepth(root, camera);
  }
}
