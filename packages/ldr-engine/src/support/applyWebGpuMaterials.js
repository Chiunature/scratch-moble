'use strict';

/**
 * WebGPU 路径下的 LDraw 材质覆盖（在 registerVendor.ts 末尾调用）。
 *
 * 背景：vendor 原版用 RawShaderMaterial + GLSL，WebGPURenderer 不支持，
 * 因此改用 MeshBasicMaterial / LineBasicMaterial，并在此补齐移动端需要的逻辑。
 *
 * 边线（Type 2 Line）修复要点：
 * - 零件面 polygonOffset 略后退，边线 depthWrite:false + 负 polygonOffset 前移
 * - 避免共面 z-fighting 导致描边闪烁、断断续续
 *
 * 条件线（Type 5 Conditional Line）：
 * - 原版在 vertex shader 里按视角裁剪，WebGPU 无法复用
 * - 改为 CPU 侧 updateWebGpuConditionalLines（见 LdrModelScene.tsx useFrame）
 * - 算法与 LDRShaders.js createConditionalVertexShader 一致
 *
 * 后续修改指引：
 * - 去掉描边：在 LDRLoader.js 跳过 lineGeometries / conditionalLineGeometries 创建
 * - 边线仍闪：调 polygonOffsetFactor/Units，或改 renderOrder
 * - 条件线不对：查 isConditionalLineVisible 与 LDRShaders.js 是否一致
 * - 关闭条件线：addLines 里 conditional 分支直接 return
 */

const conditionalLineMeshes = new WeakSet();

function resolveColorInfo(colors, colorId) {
  const resolvedId = colorId < 0 ? -colorId - 1 : colorId;
  return colors[resolvedId];
}

function createWebGpuLineMaterial(THREE, colors, colorId) {
  const colorInfo = resolveColorInfo(colors, colorId);

  return new THREE.LineBasicMaterial({
    color: colorInfo?.edge ?? colorInfo?.value ?? 0x333333,
    // 不写深度，避免与零件面抢同一深度缓冲
    depthWrite: false,
    depthTest: true,
    // 负 offset 让边线略微浮在零件表面之上
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
}

/** 复刻 LDRShaders.js 条件线可见性判定（LDraw spec type 5） */
function isConditionalLineVisible(mvpMatrix, scratch, p1, p2, p3, p4) {
  scratch.p1.set(p1[0], p1[1], p1[2], 1).applyMatrix4(mvpMatrix);
  const xp1x = scratch.p1.x / scratch.p1.w;
  const xp1y = scratch.p1.y / scratch.p1.w;

  scratch.p2.set(p2[0], p2[1], p2[2], 1).applyMatrix4(mvpMatrix);
  const d12x = scratch.p2.y / scratch.p2.w - xp1y;
  let d12y = scratch.p2.x / scratch.p2.w - xp1x;
  d12y = -d12y;

  scratch.p3.set(p3[0], p3[1], p3[2], 1).applyMatrix4(mvpMatrix);
  const d13x = scratch.p3.x / scratch.p3.w - xp1x;
  const d13y = scratch.p3.y / scratch.p3.w - xp1y;

  scratch.p4.set(p4[0], p4[1], p4[2], 1).applyMatrix4(mvpMatrix);
  const d14x = scratch.p4.x / scratch.p4.w - xp1x;
  const d14y = scratch.p4.y / scratch.p4.w - xp1y;

  return (d12x * d13x + d12y * d13y) * (d12x * d14x + d12y * d14y) > 0;
}

/** 按当前相机重建条件线 draw geometry（只保留可见线段） */
function updateConditionalLineMesh(mesh, camera, scratch, buffers) {
  const sourceGeometry = mesh.userData._ldrSourceGeometry;
  if (!sourceGeometry) {
    return;
  }

  const positions = sourceGeometry.getAttribute('position');
  const p3Attr = sourceGeometry.getAttribute('p3');
  const p4Attr = sourceGeometry.getAttribute('p4');
  if (!positions || !p3Attr || !p4Attr) {
    return;
  }

  mesh.updateMatrixWorld(false);
  buffers.modelView.multiplyMatrices(
    camera.matrixWorldInverse,
    mesh.matrixWorld,
  );
  buffers.mvp.multiplyMatrices(camera.projectionMatrix, buffers.modelView);

  const src = positions.array;
  const p3s = p3Attr.array;
  const p4s = p4Attr.array;
  const visible = buffers.visiblePositions;
  visible.length = 0;

  for (let i = 0; i < positions.count; i += 2) {
    const i3 = i * 3;
    const p1 = [src[i3], src[i3 + 1], src[i3 + 2]];
    const p2 = [src[i3 + 3], src[i3 + 4], src[i3 + 5]];
    const p3 = [p3s[i3], p3s[i3 + 1], p3s[i3 + 2]];
    const p4 = [p4s[i3], p4s[i3 + 1], p4s[i3 + 2]];

    if (isConditionalLineVisible(buffers.mvp, scratch, p1, p2, p3, p4)) {
      visible.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
    }
  }

  let drawGeometry = mesh.userData._ldrDrawGeometry;
  if (!drawGeometry) {
    drawGeometry = new THREE.BufferGeometry();
    mesh.userData._ldrDrawGeometry = drawGeometry;
    mesh.geometry = drawGeometry;
  }

  if (visible.length === 0) {
    drawGeometry.setDrawRange(0, 0);
    return;
  }

  let positionAttr = mesh.userData._ldrPositionAttr;
  if (!positionAttr || positionAttr.array.length !== visible.length) {
    positionAttr = new THREE.Float32BufferAttribute(visible, 3);
    mesh.userData._ldrPositionAttr = positionAttr;
    drawGeometry.setAttribute('position', positionAttr);
  } else {
    positionAttr.array.set(visible);
    positionAttr.needsUpdate = true;
  }

  drawGeometry.setDrawRange(0, visible.length / 3);
}

function applyWebGpuMaterials() {
  const THREE = globalThis.THREE;
  const colors = globalThis.LDR.Colors;
  const LDR = globalThis.LDR;

  colors.buildTriangleMaterial = function buildTriangleMaterial(colorId) {
    const colorInfo = resolveColorInfo(colors, colorId);
    const isTrans = colors.isTrans(colorId);

    return new THREE.MeshBasicMaterial({
      color: colorInfo?.value ?? 0x808080,
      transparent: isTrans,
      opacity: isTrans ? 0.75 : 1,
      depthWrite: !isTrans,
      side: THREE.DoubleSide,
      // 正 offset 让零件面略退后，给边线让位（与 createWebGpuLineMaterial 配对）
      polygonOffset: true,
      polygonOffsetFactor: colors.DEFAULT_POLYGON_OFFSET_FACTOR ?? 1,
      polygonOffsetUnits: colors.DEFAULT_POLYGON_OFFSET_UNITS ?? 1,
    });
  };

  colors.buildLineMaterial = function buildLineMaterial(colorId, conditional) {
    // conditional 参数保留以兼容 LDRLoader 签名；条件线裁剪在 CPU 侧完成
    return createWebGpuLineMaterial(THREE, colors, colorId);
  };

  const originalAddLines = LDR.MeshCollector.prototype.addLines;
  LDR.MeshCollector.prototype.addLines = function addLines(
    color,
    mesh,
    part,
    conditional,
  ) {
    mesh.renderOrder = conditional ? 2 : 1;
    mesh.frustumCulled = false;

    if (conditional) {
      mesh.userData.ldrConditionalLine = true;
      mesh.userData._ldrSourceGeometry = mesh.geometry;
      conditionalLineMeshes.add(mesh);
    }

    return originalAddLines.call(this, color, mesh, part, conditional);
  };

  const scratch = {
    p1: new THREE.Vector4(),
    p2: new THREE.Vector4(),
    p3: new THREE.Vector4(),
    p4: new THREE.Vector4(),
  };
  const buffers = {
    modelView: new THREE.Matrix4(),
    mvp: new THREE.Matrix4(),
    visiblePositions: [],
  };

  /** 相机变化时由 LdrModelScene 调用，刷新条件线可见性 */
  LDR.updateWebGpuConditionalLines = function updateWebGpuConditionalLines(
    root,
    camera,
  ) {
    root.traverse(child => {
      if (!conditionalLineMeshes.has(child)) {
        return;
      }
      updateConditionalLineMesh(child, camera, scratch, buffers);
    });
  };
}

module.exports = { applyWebGpuMaterials };
