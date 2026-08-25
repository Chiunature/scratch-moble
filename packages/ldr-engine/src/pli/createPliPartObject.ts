import * as THREE from 'three';

import type { LdrLoaderInstance, LdrPartType } from '../types';

type GeneratableLdrPartType = LdrPartType &
  Required<Pick<LdrPartType, 'generateThreePart'>>;

/** 与 support/applyRuntimeMaterials.js 的同名标记保持一致 */
const SKIP_NEW_PART_HIGHLIGHT_FLAG = 'ldrSkipNewPartHighlight';

export type CreatePliPartObjectInput = {
  loader: LdrLoaderInstance;
  partID: string;
  colorID: number;
};

function normalizePartID(id: string): string {
  return id.replace(/\\/g, '/').toLowerCase();
}

function resolvePartType(
  loader: LdrLoaderInstance,
  partID: string,
): GeneratableLdrPartType {
  const partType = loader.getPartType(normalizePartID(partID));
  if (!partType) {
    throw new Error(`PLI part "${partID}" is not loaded.`);
  }

  if (typeof partType.generateThreePart !== 'function') {
    throw new Error(`PLI part "${partID}" cannot generate THREE geometry.`);
  }

  return partType as GeneratableLdrPartType;
}

export function createPliPartObject({
  loader,
  partID,
  colorID,
}: CreatePliPartObjectInput): THREE.Group {
  const partType = resolvePartType(loader, partID);
  const root = new THREE.Group();
  const opaqueObject = new THREE.Group();
  const sixteenObject = new THREE.Group();
  const transObject = new THREE.Group();

  root.name = `pli:${normalizePartID(partID)}:${colorID}`;
  root.add(opaqueObject);
  root.add(sixteenObject);
  root.add(transObject);

  const meshCollector = new globalThis.LDR.MeshCollector(
    opaqueObject,
    sixteenObject,
    transObject,
    undefined,
    loader,
  );
  // 零件预览图里每个零件都是“新件”，跳过新件红/绿高亮描边，只用零件本色
  (meshCollector as unknown as Record<string, boolean>)[
    SKIP_NEW_PART_HIGHLIGHT_FLAG
  ] = true;
  const position = new THREE.Vector3();
  const rotation = new THREE.Matrix3().set(1, 0, 0, 0, -1, 0, 0, 0, -1);

  partType.generateThreePart(
    loader,
    colorID,
    position,
    rotation,
    true,
    false,
    meshCollector,
  );
  meshCollector.draw(false);

  return root;
}