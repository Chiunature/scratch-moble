'use strict';

/**
 * WebGPU 路径下的 LDraw 材质与显隐策略（registerVendor 末尾调用）。
 *
 * - Type 2 / Type 5：LineBasicNodeMaterial；切步由 stabilize 换材质防残影
 * - 显隐：scale 0/1 + 隐藏时 removeFromParent
 * - 面 polygonOffset +1 / 线 -4，减轻共面断续
 * - 超采样 2× 封顶 4 + MSAA4 见 makeWebGPURenderer / FiberCanvas
 */

const ENABLE_EDGE_LINES = true;
const ENABLE_CONDITIONAL_LINES = true;
const CONDITIONAL_LINE_FLAG = 'ldrConditionalLine';
const EDGE_LINE_FLAG = 'ldrEdgeLine';
const SCENE_PARENT_KEY = 'ldrSceneParent';

function resolveColorInfo(colors, colorId) {
  const resolvedId = colorId < 0 ? -colorId - 1 : colorId;
  return colors[resolvedId];
}

function resolveLineColor(colors, colorId) {
  const colorInfo = resolveColorInfo(colors, colorId);
  return colorInfo?.edge ?? colorInfo?.value ?? 0x333333;
}

/** scale 0/1 + 场景图摘挂；parent 按 mesh 存。 */
function setMeshShown(mesh, shown, parent) {
  if (!mesh) {
    return;
  }

  mesh.visible = true;
  const scale = shown ? 1 : 0;
  mesh.scale.set(scale, scale, scale);

  const attachParent =
    parent || mesh.userData?.[SCENE_PARENT_KEY] || mesh.parent || null;
  if (attachParent) {
    mesh.userData = mesh.userData || {};
    mesh.userData[SCENE_PARENT_KEY] = attachParent;
  }

  if (shown) {
    if (attachParent && mesh.parent !== attachParent) {
      attachParent.add(mesh);
    }
  } else if (mesh.parent) {
    mesh.removeFromParent();
  }
}

function shouldShowTriangleFaces(collector, part) {
  if (!collector.visible) {
    return false;
  }
  const LDR = globalThis.LDR;
  const hideGhostFace =
    !collector.old &&
    LDR.Options &&
    LDR.Options.showEditor &&
    part &&
    part.original &&
    part.original.ghost;
  return !hideGhostFace;
}

function getWebGpuThree(fallback) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('three/webgpu');
  } catch {
    return fallback;
  }
}

/** 条件线：vertex 算视角 sign，fragment alphaTest discard。 */
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

  const conditionalAlpha = varying(
    Fn(() => {
      const m = cameraProjectionMatrix.mul(modelViewMatrix);
      const clip1 = m.mul(vec4(positionLocal, 1));
      const clip2 = m.mul(vec4(p2Attr, 1));
      const clip3 = m.mul(vec4(p3Attr, 1));
      const clip4 = m.mul(vec4(p4Attr, 1));

      const xp1 = clip1.xy;
      const d12 = vec2(clip2.y.sub(xp1.y), xp1.x.sub(clip2.x));
      const d13 = clip3.xy.sub(xp1);
      const d14 = clip4.xy.sub(xp1);
      return sign(dot(d12, d13).mul(dot(d12, d14)));
    })(),
    'vLdrConditionalAlpha',
  );

  const MaterialCtor = THREE.LineBasicNodeMaterial;
  if (typeof MaterialCtor !== 'function') {
    throw new Error('LineBasicNodeMaterial unavailable');
  }

  const material = new MaterialCtor({
    color: resolveLineColor(colors, colorId),
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.001,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  material.opacityNode = conditionalAlpha;
  material.userData = material.userData || {};
  material.userData[CONDITIONAL_LINE_FLAG] = true;

  return material;
}

function applyWebGpuMaterials() {
  const THREE = globalThis.THREE;
  const WebGpuTHREE = getWebGpuThree(THREE);
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
      polygonOffset: true,
      polygonOffsetFactor: colors.DEFAULT_POLYGON_OFFSET_FACTOR ?? 1,
      polygonOffsetUnits: colors.DEFAULT_POLYGON_OFFSET_UNITS ?? 1,
    });
  };

  colors.buildLineMaterial = function buildLineMaterial(colorId, conditional) {
    if (conditional && ENABLE_CONDITIONAL_LINES) {
      try {
        return createConditionalLineNodeMaterial(
          WebGpuTHREE,
          colors,
          colorId,
        );
      } catch (error) {
        console.warn(
          '[ldr-engine] conditional LineBasicNodeMaterial failed',
          error,
        );
      }
    }

    const NodeLine = WebGpuTHREE.LineBasicNodeMaterial;
    if (typeof NodeLine === 'function') {
      const material = new NodeLine({
        color: resolveLineColor(colors, colorId),
        depthWrite: false,
        depthTest: true,
        transparent: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });
      material.userData = material.userData || {};
      material.userData[EDGE_LINE_FLAG] = true;
      return material;
    }

    return new THREE.LineBasicMaterial({
      color: resolveLineColor(colors, colorId),
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
  };

  const originalAddLineRecord = LDR.MeshCollector.prototype.addLineRecord;
  LDR.MeshCollector.prototype.addLineRecord = function addLineRecord(
    color,
    batchRecord,
    part,
    conditional,
  ) {
    if (conditional) {
      if (!ENABLE_CONDITIONAL_LINES) {
        return;
      }
      return originalAddLineRecord.call(
        this,
        color,
        batchRecord,
        part,
        conditional,
      );
    }
    if (!ENABLE_EDGE_LINES) {
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
    if (conditional && !ENABLE_CONDITIONAL_LINES) {
      if (mesh?.geometry) {
        mesh.geometry.dispose();
      }
      return;
    }

    if (!conditional && !ENABLE_EDGE_LINES) {
      if (mesh?.geometry) {
        mesh.geometry.dispose();
      }
      return;
    }

    mesh.renderOrder = conditional ? 2 : 1;
    mesh.frustumCulled = false;
    mesh.userData = mesh.userData || {};
    if (conditional) {
      mesh.userData[CONDITIONAL_LINE_FLAG] = true;
    } else {
      mesh.userData[EDGE_LINE_FLAG] = true;
    }

    const result = originalAddLines.call(this, color, mesh, part, conditional);
    const record = this.lineMeshes[this.lineMeshes.length - 1];
    if (record && record.mesh === mesh) {
      record.parent = this.opaqueObject;
    }
    setMeshShown(mesh, this.visible, this.opaqueObject);
    return result;
  };

  const originalAddMeshObject = LDR.MeshCollector.prototype.addMeshObject;
  LDR.MeshCollector.prototype.addMeshObject = function addMeshObject(
    color,
    mesh,
    part,
  ) {
    mesh.frustumCulled = false;
    const result = originalAddMeshObject.call(this, color, mesh, part);
    const record = this.triangleMeshes[this.triangleMeshes.length - 1];
    const parent = record?.parent || this.getTriangleParent(color);
    if (record && !record.parent) {
      record.parent = parent;
    }
    setMeshShown(mesh, shouldShowTriangleFaces(this, part), parent);
    return result;
  };

  LDR.MeshCollector.prototype.updateMeshVisibility =
    function updateMeshVisibility() {
      this.flushBatches();
      const visible = this.visible;

      this.lineMeshes.forEach(obj => {
        setMeshShown(obj.mesh, visible, obj.parent || this.opaqueObject);
      });

      this.triangleMeshes.forEach(obj => {
        setMeshShown(
          obj.mesh,
          shouldShowTriangleFaces(this, obj.part),
          obj.parent,
        );
      });
    };
}

module.exports = {
  applyWebGpuMaterials,
};
