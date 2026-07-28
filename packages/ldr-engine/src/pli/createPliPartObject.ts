import * as THREE from 'three';

import type { LdrLoaderInstance, LdrPartType } from '../types';

type GeneratableLdrPartType = LdrPartType &
  Required<Pick<LdrPartType, 'generateThreePart'>>;

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