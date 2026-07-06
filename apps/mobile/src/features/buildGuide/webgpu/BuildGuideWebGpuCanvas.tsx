import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

import { resolveStepGlbUri } from '../data/bundles';
import type { BuildGuideBundle, BuildGuideStep } from '../types';
import { applyStepToScene, disposeObject3D } from './applyStepToScene';
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

function StepMesh({ uri, displayScale = 1 }: { uri: string; displayScale?: number }) {
  const gltf = useGltfAsset(uri);
  const model = useMemo(() => {
    if (!gltf) {
      return null;
    }

    const clone = gltf.scene.clone(true);
    normalizeGltfMaterials(clone);
    fitObjectToView(clone, 1.2 * displayScale);
    return clone;
  }, [gltf, displayScale]);

  useEffect(() => {
    return () => {
      if (model) {
        disposeObject3D(model);
      }
    };
  }, [model]);

  if (!model) {
    return null;
  }

  return <primitive object={model} />;
}

function BuildGuideScene({
  modelUri,
  step,
  stepIndex,
}: {
  modelUri: string;
  step: BuildGuideStep | undefined;
  stepIndex: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    applyStepToScene(camera as THREE.PerspectiveCamera, step, stepIndex);
  }, [camera, step, stepIndex]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight intensity={1.1} position={[4, 6, 3]} />
      <StepMesh uri={modelUri} displayScale={step?.displayScale} />
    </>
  );
}

type BuildGuideWebGpuCanvasProps = {
  bundle: BuildGuideBundle;
  stepIndex: number;
};

export function BuildGuideWebGpuCanvas({
  bundle,
  stepIndex,
}: BuildGuideWebGpuCanvasProps) {
  const [OrbitControls, events] = useOrbitControls();
  const step = bundle.manifest.steps[stepIndex];
  const modelUri = useMemo(
    () => resolveStepGlbUri(bundle, stepIndex),
    [bundle, stepIndex],
  );

  return (
    <View style={{ flex: 1 }} {...events}>
      <FiberCanvas style={{ flex: 1 }}>
        <OrbitControls enablePan={false} dampingFactor={0.08} />
        <BuildGuideScene
          key={step?.glb ?? stepIndex}
          modelUri={modelUri}
          step={step}
          stepIndex={stepIndex}
        />
      </FiberCanvas>
    </View>
  );
}
