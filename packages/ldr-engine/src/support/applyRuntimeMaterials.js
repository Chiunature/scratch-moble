/* global globalThis */
'use strict';

const ENABLE_EDGE_LINES = true;
const ENABLE_CONDITIONAL_LINES = true;
const CONDITIONAL_LINE_FLAG = 'ldrConditionalLine';
const EDGE_LINE_FLAG = 'ldrEdgeLine';
const SCENE_PARENT_KEY = 'ldrSceneParent';
const FACE_BASE_COLOR_KEY = 'ldrBaseFaceColor';
const EDGE_BASE_COLOR_KEY = 'ldrBaseEdgeColor';
const COLOR_ID_KEY = 'ldrColorId';
const TRANSPARENT_FLAG = 'ldrTransparent';
const OPACITY_KEY = 'ldrOpacity';
const PATCH_FLAG = '__scratchMobileRuntimeMaterialsApplied';

const HIGHLIGHT_EDGE_RED = 0xcc0000;
const HIGHLIGHT_EDGE_LIME = 0x20f000;

function resolveColorInfo(colors, colorId) {
  const resolvedId = colorId < 0 ? -colorId - 1 : colorId;
  return colors[resolvedId];
}

function resolveFaceOpacity(colors, colorId) {
  const colorInfo = resolveColorInfo(colors, colorId);
  if (!colorInfo || !(colorInfo.alpha > 0)) {
    return 1;
  }
  return colorInfo.alpha / 255;
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
  }
}

function setMaterialOpacity(material, opacity) {
  if (!material) {
    return;
  }
  material.opacity = opacity;
  material.transparent = opacity < 0.999;
  material.depthWrite = opacity >= 0.999;
  material.userData = material.userData || {};
  if (opacity < 0.999) {
    material.userData[TRANSPARENT_FLAG] = true;
    material.userData[OPACITY_KEY] = opacity;
  }
}

function createTriangleMaterial(THREE, colors, colorId) {
  const colorInfo = resolveColorInfo(colors, colorId);
  const isTrans = colors.isTrans(colorId);
  const opacity = isTrans ? resolveFaceOpacity(colors, colorId) : 1;
  const material = new THREE.MeshBasicMaterial({
    color: colorInfo?.value ?? 0x808080,
    transparent: isTrans,
    opacity,
    depthWrite: !isTrans,
    depthTest: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: colors.DEFAULT_POLYGON_OFFSET_FACTOR ?? 1,
    polygonOffsetUnits: colors.DEFAULT_POLYGON_OFFSET_UNITS ?? 1,
  });

  material.userData = material.userData || {};
  if (isTrans) {
    material.userData[TRANSPARENT_FLAG] = true;
    material.userData[OPACITY_KEY] = opacity;
  }
  return material;
}

function createLineMaterial(THREE, colors, colorId, conditional) {
  const material = new THREE.LineBasicMaterial({
    color: resolveLineColor(colors, colorId),
    depthWrite: false,
    depthTest: true,
    transparent: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  material.userData = material.userData || {};
  material.userData[conditional ? CONDITIONAL_LINE_FLAG : EDGE_LINE_FLAG] = true;
  return material;
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
    setMaterialHex(mesh.material, old && mode === 3 ? oldFace : base);
    setMaterialOpacity(mesh.material, resolveFaceOpacity(LDR.Colors, obj.color));
  });

  collector.lineMeshes.forEach(obj => {
    const mesh = obj.mesh;
    if (!mesh || mesh.userData?.[CONDITIONAL_LINE_FLAG]) {
      return;
    }
    const base =
      mesh.userData?.[EDGE_BASE_COLOR_KEY] ?? resolveLineColor(LDR.Colors, obj.color);

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

function applyRuntimeMaterials() {
  const THREE = globalThis.THREE;
  const LDR = globalThis.LDR;
  if (!THREE || !LDR || LDR[PATCH_FLAG]) {
    return;
  }

  LDR[PATCH_FLAG] = true;
  const colors = LDR.Colors;
  colors.canBeOld = true;

  colors.buildTriangleMaterial = function buildTriangleMaterial(colorId) {
    return createTriangleMaterial(THREE, colors, colorId);
  };

  colors.buildLineMaterial = function buildLineMaterial(colorId, conditional) {
    return createLineMaterial(THREE, colors, colorId, conditional);
  };

  const originalAddLineRecord = LDR.MeshCollector.prototype.addLineRecord;
  LDR.MeshCollector.prototype.addLineRecord = function addLineRecord(
    color,
    batchRecord,
    part,
    conditional,
  ) {
    if (conditional && !ENABLE_CONDITIONAL_LINES) {
      return;
    }
    if (!conditional && !ENABLE_EDGE_LINES) {
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
    applyCollectorAppearance(this, this.old);
  };

  LDR.MeshCollector.prototype.colorLinesHighContrast =
    function colorLinesHighContrast() {
      this.flushBatches();
      recolorCollectorLines(this, true);
      applyCollectorAppearance(this, this.old);
    };

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
  applyRuntimeMaterials,
  TRANSPARENT_FLAG,
  OPACITY_KEY,
};