'use strict';

/**
 * WebGPU 路径下的 LDraw 材质与显隐策略（registerVendor 末尾调用）。
 *
 * - Type 2 / Type 5：LineBasicNodeMaterial；切步由 stabilize 换材质防残影
 * - 显隐：scale 0/1 + 隐藏时 removeFromParent
 * - 面 polygonOffset +1 / 线 -4，减轻共面断续
 * - lineContrast / showOldColors：在 setOldValue / colorLines* 里改 MeshBasic 颜色
 * - 超采样 2× 封顶 4 + MSAA4 见 makeWebGPURenderer / FiberCanvas
 */

const ENABLE_EDGE_LINES = true;
const ENABLE_CONDITIONAL_LINES = true;
const CONDITIONAL_LINE_FLAG = 'ldrConditionalLine';
const EDGE_LINE_FLAG = 'ldrEdgeLine';
const SCENE_PARENT_KEY = 'ldrSceneParent';
const FACE_BASE_COLOR_KEY = 'ldrBaseFaceColor';
const EDGE_BASE_COLOR_KEY = 'ldrBaseEdgeColor';
const COLOR_ID_KEY = 'ldrColorId';

const HIGHLIGHT_EDGE_RED = 0xcc0000;
const HIGHLIGHT_EDGE_LIME = 0x20f000;

function resolveColorInfo(colors, colorId) {
  const resolvedId = colorId < 0 ? -colorId - 1 : colorId;
  return colors[resolvedId];
}

function vector4ToHex(v4) {
  if (!v4) {
    return 0x333333;
  }
  const r = Math.round(v4.x * 255);
  const g = Math.round(v4.y * 255);
  const b = Math.round(v4.z * 255);
  return (r << 16) | (g << 8) | b;
}

function resolveLineColor(colors, colorId) {
  const LDR = globalThis.LDR;
  if (LDR?.Options?.lineContrast === 0 && colors.getHighContrastColor4) {
    return vector4ToHex(colors.getHighContrastColor4(colorId));
  }
  const colorInfo = resolveColorInfo(colors, colorId);
  return colorInfo?.edge ?? colorInfo?.value ?? 0x333333;
}

function setMaterialHex(material, hex) {
  if (!material) {
    return;
  }
  if (material.color && typeof material.color.setHex === 'function') {
    material.color.setHex(hex);
    return;
  }
  if (material.color && typeof material.color.set === 'function') {
    material.color.set(hex);
  }
}

function applyCollectorAppearance(collector, old) {
  const LDR = globalThis.LDR;
  const mode = LDR?.Options?.showOldColors ?? 2;
  const oldFace = LDR?.Options?.oldColor ?? 0xffff6f;
  const oldEdge = 0xaaaa66;

  collector.triangleMeshes.forEach(obj => {
    const mesh = obj.mesh;
    if (!mesh) {
      return;
    }
    const base =
      mesh.userData?.[FACE_BASE_COLOR_KEY] ??
      resolveColorInfo(LDR.Colors, obj.color)?.value ??
      0x808080;
    if (old && mode === 3) {
      setMaterialHex(mesh.material, oldFace);
    } else {
      setMaterialHex(mesh.material, base);
    }
  });

  collector.lineMeshes.forEach(obj => {
    const mesh = obj.mesh;
    if (!mesh || mesh.userData?.[CONDITIONAL_LINE_FLAG]) {
      return;
    }
    const base =
      mesh.userData?.[EDGE_BASE_COLOR_KEY] ??
      resolveLineColor(LDR.Colors, obj.color);

    if (old && mode === 3) {
      setMaterialHex(mesh.material, oldEdge);
    } else if (!old && mode === 0) {
      setMaterialHex(mesh.material, HIGHLIGHT_EDGE_RED);
    } else if (!old && mode === 1) {
      setMaterialHex(mesh.material, HIGHLIGHT_EDGE_LIME);
    } else {
      setMaterialHex(mesh.material, base);
    }
  });
}

function recolorCollectorLines(collector, highContrast) {
  const LDR = globalThis.LDR;
  const colors = LDR.Colors;
  collector.lineMeshes.forEach(obj => {
    const mesh = obj.mesh;
    if (!mesh || mesh.userData?.[CONDITIONAL_LINE_FLAG]) {
      return;
    }
    const hex = highContrast
      ? vector4ToHex(colors.getHighContrastColor4(obj.color))
      : resolveColorInfo(colors, obj.color)?.edge ??
        resolveColorInfo(colors, obj.color)?.value ??
        0x333333;
    mesh.userData[EDGE_BASE_COLOR_KEY] = hex;
  });
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

  // WebGPU 用改 color 代替 RawShader old uniform
  colors.canBeOld = true;

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
    mesh.userData[COLOR_ID_KEY] = color;
    mesh.userData[EDGE_BASE_COLOR_KEY] = resolveLineColor(colors, color);
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
    mesh.userData = mesh.userData || {};
    mesh.userData[COLOR_ID_KEY] = color;
    mesh.userData[FACE_BASE_COLOR_KEY] =
      resolveColorInfo(colors, color)?.value ?? 0x808080;
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

  LDR.MeshCollector.prototype.setOldValue = function setOldValue(old) {
    this.flushBatches();
    applyCollectorAppearance(this, old);
  };

  LDR.MeshCollector.prototype.colorLinesLDraw = function colorLinesLDraw() {
    this.flushBatches();
    recolorCollectorLines(this, false);
  };

  LDR.MeshCollector.prototype.colorLinesHighContrast =
    function colorLinesHighContrast() {
      this.flushBatches();
      recolorCollectorLines(this, true);
    };

  // 始终按当前 Options 刷新边线基准色 + old/高亮外观（设置面板即时生效）
  LDR.MeshCollector.prototype.update = function update(old) {
    this.flushBatches();
    if (LDR.Options) {
      if (LDR.Options.lineContrast === 1) {
        this.colorLinesLDraw();
      } else {
        this.colorLinesHighContrast();
      }
    }
    this.setOldValue(old);
    this.updateState(old);
  };
}

module.exports = {
  applyWebGpuMaterials,
};
