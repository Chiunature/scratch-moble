'use strict';

/**
 * WebGPU 路径下的 LDraw 材质覆盖（在 registerVendor.ts 末尾调用）。
 *
 * 背景：vendor 原版用 RawShaderMaterial + GLSL，WebGPURenderer 不支持，
 * 因此改用 MeshBasicMaterial / LineBasicNodeMaterial，并在此补齐移动端需要的逻辑。
 *
 * 边线（Type 2 Line）修复要点：
 * - 零件面 polygonOffset 略后退，边线 depthWrite:false + 负 polygonOffset 前移
 * - 避免共面 z-fighting 导致描边闪烁、断断续续
 *
 * 条件线（Type 5 Conditional Line）：
 * - 原版在 vertex shader 里按视角裁剪（LDRShaders.js）
 * - WebGPU 用 LineBasicNodeMaterial + TSL 复刻同一算法（GPU 侧 discard）
 * - 几何体需保留 p2/p3/p4 attribute（见 LDRGeometries.buildConditionalLineGeometries）
 *
 * 后续修改指引：
 * - 去掉描边：在 LDRLoader.js 跳过 lineGeometries / conditionalLineGeometries 创建
 * - 边线仍闪：调 polygonOffsetFactor/Units，或改 renderOrder
 * - 条件线不对：对照 LDRShaders.js createConditionalVertexShader
 * - 关闭条件线：addLines 里 conditional 分支直接 return
 */

function resolveColorInfo(colors, colorId) {
  const resolvedId = colorId < 0 ? -colorId - 1 : colorId;
  return colors[resolvedId];
}

function resolveLineColor(colors, colorId) {
  const colorInfo = resolveColorInfo(colors, colorId);
  return colorInfo?.edge ?? colorInfo?.value ?? 0x333333;
}

function createBasicLineMaterial(THREE, colors, colorId) {
  return new THREE.LineBasicMaterial({
    color: resolveLineColor(colors, colorId),
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
}

/**
 * GPU 条件线：与 LDRShaders.createConditionalVertexShader 等价。
 * 在 vertex 里算 sign(dot(d12,d13)*dot(d12,d14))，fragment 用 alphaTest discard。
 */
function createConditionalLineNodeMaterial(THREE, colors, colorId) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tsl = require('three/tsl');
  const {
    Fn,
    attribute,
    cameraProjectionMatrix,
    dot,
    modelViewMatrix,
    positionLocal,
    sign,
    varying,
    vec2,
    vec4,
  } = tsl;

  const p2Attr = attribute('p2', 'vec3');
  const p3Attr = attribute('p3', 'vec3');
  const p4Attr = attribute('p4', 'vec3');

  // varying(node) 会把可见性计算钉在 vertex stage（与原版 vColor.a 一致）
  const conditionalAlpha = varying(
    Fn(() => {
      const m = cameraProjectionMatrix.mul(modelViewMatrix);
      const clip1 = m.mul(vec4(positionLocal, 1));
      const clip2 = m.mul(vec4(p2Attr, 1));
      const clip3 = m.mul(vec4(p3Attr, 1));
      const clip4 = m.mul(vec4(p4Attr, 1));

      // 对齐 GLSL：d12 = clip2.yx - xp1.yx; d12.y = -d12.y
      const xp1 = clip1.xy;
      const d12 = vec2(clip2.y.sub(xp1.y), xp1.x.sub(clip2.x));
      const d13 = clip3.xy.sub(xp1);
      const d14 = clip4.xy.sub(xp1);
      return sign(dot(d12, d13).mul(dot(d12, d14)));
    })(),
    'vLdrConditionalAlpha',
  );

  const material = new THREE.LineBasicNodeMaterial({
    color: resolveLineColor(colors, colorId),
    depthWrite: false,
    depthTest: true,
    // 与原版 AlphaTestFragmentShader 阈值一致
    alphaTest: 0.001,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  material.opacityNode = conditionalAlpha;

  return material;
}

function createLineMaterial(THREE, colors, colorId, conditional) {
  if (conditional && typeof THREE.LineBasicNodeMaterial === 'function') {
    return createConditionalLineNodeMaterial(THREE, colors, colorId);
  }
  return createBasicLineMaterial(THREE, colors, colorId);
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
      polygonOffset: true,
      polygonOffsetFactor: colors.DEFAULT_POLYGON_OFFSET_FACTOR ?? 1,
      polygonOffsetUnits: colors.DEFAULT_POLYGON_OFFSET_UNITS ?? 1,
    });
  };

  colors.buildLineMaterial = function buildLineMaterial(colorId, conditional) {
    return createLineMaterial(THREE, colors, colorId, conditional);
  };

  const originalAddLines = LDR.MeshCollector.prototype.addLines;
  LDR.MeshCollector.prototype.addLines = function addLines(
    color,
    mesh,
    part,
    conditional,
  ) {
    mesh.renderOrder = conditional ? 2 : 1;
    // 条件线依赖自定义 attribute；关闭 frustum cull 避免包围盒误裁
    mesh.frustumCulled = false;

    if (conditional) {
      mesh.userData.ldrConditionalLine = true;
    }

    return originalAddLines.call(this, color, mesh, part, conditional);
  };

  // CPU 路径已移除；保留 no-op 以免旧调用方崩溃
  LDR.updateWebGpuConditionalLines = function updateWebGpuConditionalLines() {};
}

module.exports = { applyWebGpuMaterials };
