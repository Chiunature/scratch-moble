/**
 * RN WebGPU 切步后的场景稳定化。
 *
 * 背景：visible=false / LineSegments 在真机上不可靠；切步后需：
 * - 关掉 frustumCulled、禁用 polygonOffset
 * - 按世界包围盒收紧 near/far（深度精度）
 * - 对当前显示的 Mesh 换新材质，打断偶发坏掉的 pipeline 缓存
 */
import * as THREE from 'three';

const _sphere = new THREE.Sphere();
const _box = new THREE.Box3();
const _center = new THREE.Vector3();

const RUNTIME_MATERIAL_FLAG = 'ldrRuntimeMaterial';

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

function refreshShownMeshMaterial(mesh: THREE.Mesh): void {
  const previous = Array.isArray(mesh.material)
    ? mesh.material[0]
    : mesh.material;
  if (!previous) {
    return;
  }

  const prevMat = previous as THREE.MeshBasicMaterial;
  const isTrans = prevMat.transparent === true && (prevMat.opacity ?? 1) < 1;
  const next = new THREE.MeshBasicMaterial({
    color: getBaseColor(previous).clone(),
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: !isTrans,
    transparent: isTrans,
    opacity: isTrans ? (prevMat.opacity ?? 0.75) : 1,
    polygonOffset: false,
  });
  next.userData[RUNTIME_MATERIAL_FLAG] = true;

  disposeRuntimeMaterial(mesh.material);
  mesh.material = next;
  mesh.visible = true;
  mesh.scale.set(1, 1, 1);
}

function disablePolygonOffset(
  material: THREE.Material | THREE.Material[] | undefined,
): void {
  if (!material) {
    return;
  }
  const list = Array.isArray(material) ? material : [material];
  for (const item of list) {
    if (!item || item.polygonOffset !== true) {
      continue;
    }
    item.polygonOffset = false;
    item.polygonOffsetFactor = 0;
    item.polygonOffsetUnits = 0;
    item.needsUpdate = true;
  }
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

/**
 * 在 moveTo + 相机/root 变换之后调用。
 */
export function stabilizeWebGpuStep(
  root: THREE.Object3D,
  camera: THREE.Camera | null,
): void {
  root.traverse(child => {
    if (child.type === 'LineSegments') {
      // 边线默认不生成；若热更新残留则 scale 隐藏
      child.frustumCulled = false;
      child.visible = true;
      child.scale.set(0, 0, 0);
      return;
    }

    if (child.type !== 'Mesh') {
      return;
    }

    const mesh = child as THREE.Mesh;
    mesh.frustumCulled = false;
    disablePolygonOffset(mesh.material);

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
