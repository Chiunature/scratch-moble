import * as THREE from 'three';

function disposeMaterialMaps(material: THREE.Material): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) {
    return;
  }

  material.map?.dispose();
  material.normalMap?.dispose();
  material.roughnessMap?.dispose();
  material.metalnessMap?.dispose();
  material.aoMap?.dispose();
  material.emissiveMap?.dispose();
}

export function normalizeGltfMaterials(
  root: THREE.Object3D,
  fallbackColor = 0xffcc00,
): void {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const toFallback = () =>
      new THREE.MeshStandardMaterial({
        color: fallbackColor,
        metalness: 0.1,
        roughness: 0.8,
      });

    if (Array.isArray(object.material)) {
      object.material.forEach(disposeMaterialMaps);
      object.material = object.material.map(() => toFallback());
      return;
    }

    disposeMaterialMaps(object.material);
    object.material = toFallback();
  });
}
