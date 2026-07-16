import React, { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import type { BuildGuideStep } from '../types';
import { applyStepToScene, disposeObject3D } from './applyStepToScene';
import type {
  LdrDisplayMode,
  LdrStepHandlerFacade,
} from '@scratch-mobile/ldr-engine';

type LdrModelSceneProps = {
  stepHandler: LdrStepHandlerFacade;
  step: BuildGuideStep | undefined;
  stepIndex: number;
  mode: LdrDisplayMode;
};

type SceneStatsBucket = {
  objects: number;
  meshes: number;
  lineSegments: number;
  materials: number;
  geometries: number;
  vertices: number;
  triangles: number;
  linePrimitives: number;
};

type SceneStatsAccumulator = SceneStatsBucket & {
  materialSet: Set<THREE.Material>;
  geometrySet: Set<THREE.BufferGeometry>;
};

type RenderableObject = THREE.Object3D & {
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
  isLineSegments?: boolean;
  isMesh?: boolean;
};

function isLineSegmentsObject(object: THREE.Object3D): boolean {
  const renderable = object as RenderableObject;
  return renderable.isLineSegments === true || object.type === 'LineSegments';
}

function createStatsAccumulator(): SceneStatsAccumulator {
  return {
    objects: 0,
    meshes: 0,
    lineSegments: 0,
    materials: 0,
    geometries: 0,
    vertices: 0,
    triangles: 0,
    linePrimitives: 0,
    materialSet: new Set(),
    geometrySet: new Set(),
  };
}

function getPositionCount(geometry: THREE.BufferGeometry): number {
  return geometry.getAttribute('position')?.count ?? 0;
}

function addMaterials(
  accumulator: SceneStatsAccumulator,
  material: THREE.Material | THREE.Material[] | undefined,
): void {
  if (!material) {
    return;
  }

  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    accumulator.materialSet.add(item);
  }
}

function addRenderableStats(
  accumulator: SceneStatsAccumulator,
  object: THREE.Object3D,
): void {
  accumulator.objects += 1;

  const renderable = object as RenderableObject;
  const isMesh = renderable.isMesh === true || object.type === 'Mesh';
  const isLineSegments = isLineSegmentsObject(object);

  if (!isMesh && !isLineSegments) {
    return;
  }

  const geometry = renderable.geometry;
  const positionCount = geometry ? getPositionCount(geometry) : 0;

  addMaterials(accumulator, renderable.material);

  if (geometry) {
    accumulator.geometrySet.add(geometry);
    accumulator.vertices += positionCount;
  }

  if (isMesh) {
    accumulator.meshes += 1;
    const triangleIndexCount = geometry?.index?.count ?? positionCount;
    accumulator.triangles += Math.floor(triangleIndexCount / 3);
    return;
  }

  accumulator.lineSegments += 1;
  const lineIndexCount = geometry?.index?.count ?? positionCount;
  accumulator.linePrimitives += Math.floor(lineIndexCount / 2);
}

function snapshotStats(accumulator: SceneStatsAccumulator): SceneStatsBucket {
  return {
    objects: accumulator.objects,
    meshes: accumulator.meshes,
    lineSegments: accumulator.lineSegments,
    materials: accumulator.materialSet.size,
    geometries: accumulator.geometrySet.size,
    vertices: accumulator.vertices,
    triangles: accumulator.triangles,
    linePrimitives: accumulator.linePrimitives,
  };
}

function collectSceneStats(root: THREE.Object3D): {
  total: SceneStatsBucket;
  visible: SceneStatsBucket;
} {
  const total = createStatsAccumulator();
  const visible = createStatsAccumulator();

  root.traverse(object => addRenderableStats(total, object));
  root.traverseVisible(object => addRenderableStats(visible, object));

  return {
    total: snapshotStats(total),
    visible: snapshotStats(visible),
  };
}

export function LdrModelScene({
  stepHandler,
  step,
  stepIndex,
  mode,
}: LdrModelSceneProps) {
  const { camera, size } = useThree();
  const root = useMemo(() => stepHandler.getRoot(), [stepHandler]);
  const lastLoggedStatsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    stepHandler.moveTo(stepIndex);
  }, [stepHandler, stepIndex]);

  useEffect(() => {
    applyStepToScene(
      camera,
      root,
      step,
      stepIndex,
      stepHandler,
      size,
      mode,
    );
  }, [camera, mode, root, size, step, stepHandler, stepIndex]);

  useEffect(() => {
    const totalSteps = stepHandler.getTotalSteps();
    const isLastInstructionStep =
      mode === 'instruction' && totalSteps > 0 && stepIndex === totalSteps - 1;

    if (!isLastInstructionStep) {
      lastLoggedStatsKeyRef.current = null;
      return;
    }

    const statsKey = `${root.uuid}:${stepIndex}:${totalSteps}`;
    if (lastLoggedStatsKeyRef.current === statsKey) {
      return;
    }

    lastLoggedStatsKeyRef.current = statsKey;
    console.info('[BuildGuideSceneStats:last-step]', {
      stepIndex,
      totalSteps,
      stats: collectSceneStats(root),
    });
  }, [mode, root, stepHandler, stepIndex]);

  useEffect(() => {
    return () => {
      disposeObject3D(root);
    };
  }, [root]);

  return <primitive object={root} />;
}
