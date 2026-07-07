'use strict';

function applyWebGpuMaterials() {
  const THREE = globalThis.THREE;
  const colors = globalThis.LDR.Colors;

  colors.buildTriangleMaterial = function buildTriangleMaterial(colorId) {
    const colorInfo = colors[colorId];
    const isTrans = colors.isTrans(colorId);

    return new THREE.MeshBasicMaterial({
      color: colorInfo?.value ?? 0x808080,
      transparent: isTrans,
      opacity: isTrans ? 0.75 : 1,
      depthWrite: !isTrans,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: colors.DEFAULT_POLYGON_OFFSET_FACTOR ?? 0,
      polygonOffsetUnits: colors.DEFAULT_POLYGON_OFFSET_UNITS ?? 0.01,
    });
  };

  colors.buildLineMaterial = function buildLineMaterial(colorId) {
    const colorInfo = colors[colorId];

    return new THREE.LineBasicMaterial({
      color: colorInfo?.edge ?? colorInfo?.value ?? 0x333333,
    });
  };
}

module.exports = { applyWebGpuMaterials };
