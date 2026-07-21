'use strict';

/**
 * WebGPU 路径下的 LDraw 材质与显隐策略（registerVendor 末尾调用）。
 *
 * RN WebGPU 约束（真机验证）：
 * - 不向场景提交 LineSegments（边线/条件线）；描边改由后处理完成
 * - 不用 mesh.visible=false 隐藏零件（会被忽略并产生残影），改用 scale 0/1
 * - 关闭 polygonOffset，避免 depthBias 相关管线问题
 */

const ENABLE_EDGE_LINES = false;
const ENABLE_CONDITIONAL_LINES = false;

function resolveColorInfo(colors, colorId) {
  const resolvedId = colorId < 0 ? -colorId - 1 : colorId;
  return colors[resolvedId];
}

function setMeshShown(mesh, shown) {
  if (!mesh) {
    return;
  }
  mesh.visible = true;
  const scale = shown ? 1 : 0;
  mesh.scale.set(scale, scale, scale);
}

function shouldShowTriangleFaces(collector, part) {
  if (!collector.visible) {
    return false;
  }
  const LDR = globalThis.LDR;
  // 编辑器 ghost 零件：仅旧步显示面（原 vendor 语义）
  const hideGhostFace =
    !collector.old &&
    LDR.Options &&
    LDR.Options.showEditor &&
    part &&
    part.original &&
    part.original.ghost;
  return !hideGhostFace;
}

function applyWebGpuMaterials() {
  const THREE = globalThis.THREE;
  const LDR = globalThis.LDR;
  const colors = LDR.Colors;

  colors.buildTriangleMaterial = function buildTriangleMaterial(colorId) {
    const colorInfo = resolveColorInfo(colors, colorId);
    const isTrans = colors.isTrans(colorId);

    return new THREE.MeshBasicMaterial({
      color: colorInfo?.value ?? 0x808080,
      transparent: isTrans,
      opacity: isTrans ? 0.75 : 1,
      depthWrite: !isTrans,
      side: THREE.DoubleSide,
      polygonOffset: false,
    });
  };

  colors.buildLineMaterial = function buildLineMaterial() {
    return new THREE.LineBasicMaterial({
      color: 0x333333,
      depthWrite: true,
      depthTest: true,
      polygonOffset: false,
    });
  };

  const originalAddLineRecord = LDR.MeshCollector.prototype.addLineRecord;
  LDR.MeshCollector.prototype.addLineRecord = function addLineRecord(
    color,
    batchRecord,
    part,
    conditional,
  ) {
    if (!ENABLE_EDGE_LINES) {
      return;
    }
    if (conditional && !ENABLE_CONDITIONAL_LINES) {
      return;
    }
    return originalAddLineRecord.call(
      this,
      color,
      batchRecord,
      part,
      conditional,
    );
  };

  const originalAddLines = LDR.MeshCollector.prototype.addLines;
  LDR.MeshCollector.prototype.addLines = function addLines(
    color,
    mesh,
    part,
    conditional,
  ) {
    if (!ENABLE_EDGE_LINES || (conditional && !ENABLE_CONDITIONAL_LINES)) {
      if (mesh && mesh.geometry) {
        mesh.geometry.dispose();
      }
      return;
    }
    mesh.frustumCulled = false;
    setMeshShown(mesh, this.visible);
    return originalAddLines.call(this, color, mesh, part, conditional);
  };

  const originalAddMeshObject = LDR.MeshCollector.prototype.addMeshObject;
  LDR.MeshCollector.prototype.addMeshObject = function addMeshObject(
    color,
    mesh,
    part,
  ) {
    mesh.frustumCulled = false;
    setMeshShown(mesh, this.visible);
    return originalAddMeshObject.call(this, color, mesh, part);
  };

  LDR.MeshCollector.prototype.updateMeshVisibility =
    function updateMeshVisibility() {
      this.flushBatches();
      const visible = this.visible;

      this.lineMeshes.forEach(obj => {
        setMeshShown(obj.mesh, visible);
      });

      this.triangleMeshes.forEach(obj => {
        setMeshShown(obj.mesh, shouldShowTriangleFaces(this, obj.part));
      });
    };

  LDR.updateWebGpuConditionalLines = function updateWebGpuConditionalLines() {};
}

module.exports = {
  applyWebGpuMaterials,
  ENABLE_EDGE_LINES,
  ENABLE_CONDITIONAL_LINES,
};
