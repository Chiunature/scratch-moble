import React, { useEffect, useMemo } from 'react';
import { Image, View } from 'react-native';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

import DuckModel from '../../../../assets/models/Duck.glb';
import { FiberCanvas } from './FiberCanvas';
import { normalizeGltfMaterials } from './normalizeGltfMaterials';
import useOrbitControls from './useOrbitControls';
import { useGltfAsset } from './useGltfAsset';

function fitObjectToView(object: THREE.Object3D, targetSize = 1.2): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim > 0) {
    object.scale.multiplyScalar(targetSize / maxDim);
  }

  const centeredBox = new THREE.Box3().setFromObject(object);
  object.position.sub(centeredBox.getCenter(new THREE.Vector3()));
}

function DuckMesh({ uri }: { uri: string }) {
  const gltf = useGltfAsset(uri);
  const model = useMemo(() => {
    if (!gltf) {
      return null;
    }

    const clone = gltf.scene.clone(true);
    normalizeGltfMaterials(clone);
    fitObjectToView(clone);
    return clone;
  }, [gltf]);

  if (!model) {
    return null;
  }

  return <primitive object={model} />;
}

function BuildGuideScene({
  modelUri,
  stepIndex,
}: {
  modelUri: string;
  stepIndex: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const angle = stepIndex * 0.28;
    const radius = 2.2;
    camera.position.set(
      Math.sin(angle) * radius,
      0.35 + stepIndex * 0.03,
      Math.cos(angle) * radius,
    );
    camera.lookAt(0, 0, 0);
  }, [camera, stepIndex]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight intensity={1.1} position={[4, 6, 3]} />
      <DuckMesh uri={modelUri} />
    </>
  );
}

export function BuildGuideWebGpuCanvas({ stepIndex = 0 }: { stepIndex?: number }) {
  const [OrbitControls, events] = useOrbitControls();
  const modelUri = useMemo(() => Image.resolveAssetSource(DuckModel).uri, []);

  return (
    <View style={{ flex: 1 }} {...events}>
      <FiberCanvas style={{ flex: 1 }}>
        <OrbitControls enablePan={false} dampingFactor={0.08} />
        <BuildGuideScene modelUri={modelUri} stepIndex={stepIndex} />
      </FiberCanvas>
    </View>
  );
}
