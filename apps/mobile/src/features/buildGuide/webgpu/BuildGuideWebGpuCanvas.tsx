/**
 * BuildGuide 3D 画布入口（RN WebGPU + R3F）。
 *
 * 调用链：
 *   BuildGuideScreen
 *     → BuildGuideRuntimeCanvas（loading / error）
 *     → BuildGuideWebGpuCanvas（本文件）
 *         → FiberCanvas（WebGPU renderer + R3F root）
 *         → LdrModelScene（moveTo + applyStepToScene）
 *
 * 相机策略：
 *   - instruction：正交相机 + LDraw step/orientation 对齐
 *   - preview：透视相机 + 已经 fitObjectToView 的静态整模
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import * as THREE from 'three';

import { resolveStepViewModel } from '@scratch-mobile/build-guide';
import type { LdrDisplayMode } from '@scratch-mobile/ldr-engine';

import type { BuildGuideBundle } from '../types';
import { FiberCanvas } from './FiberCanvas';
import { LdrModelScene } from './LdrModelScene';
import useOrbitControls from './useOrbitControls';

const INTERACTION_RESTORE_DELAY_MS = 160;
const SCENE_BACKGROUND = 0xffffff;

type BuildGuideCamera = THREE.PerspectiveCamera | THREE.OrthographicCamera;

function createBuildGuideCamera(mode: LdrDisplayMode): BuildGuideCamera {
  if (mode === 'preview') {
    return new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  }

  return new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
}

function createBuildGuideScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BACKGROUND);
  return scene;
}

function resolveDisplayMode(bundle: BuildGuideBundle): LdrDisplayMode {
  return bundle.model?.mode ?? bundle.manifest.mode ?? 'instruction';
}

function BuildGuideScene({
  bundle,
  stepIndex,
  mode,
}: {
  bundle: BuildGuideBundle;
  stepIndex: number;
  mode: LdrDisplayMode;
}) {
  const totalSteps = bundle.stepHandler?.getTotalSteps() ?? 0;
  const step = useMemo(
    () =>
      bundle.stepHandler
        ? resolveStepViewModel(bundle.manifest, stepIndex, totalSteps)
        : undefined,
    [bundle.manifest, bundle.stepHandler, stepIndex, totalSteps],
  );

  if (!bundle.stepHandler || !step) {
    return null;
  }

  return (
    <LdrModelScene
      stepHandler={bundle.stepHandler}
      step={step}
      stepIndex={stepIndex}
      mode={mode}
    />
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
  const [OrbitControls, controlEvents] = useOrbitControls();
  const [isModelInteracting, setIsModelInteracting] = useState(false);
  const isModelInteractingRef = useRef(false);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mode = resolveDisplayMode(bundle);
  const renderQuality = isModelInteracting ? 'interaction' : 'default';
  const camera = useMemo(() => createBuildGuideCamera(mode), [mode]);
  const scene = useMemo(() => createBuildGuideScene(), []);

  const beginInteraction = useCallback(() => {
    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }

    if (isModelInteractingRef.current) {
      return;
    }

    isModelInteractingRef.current = true;
    setIsModelInteracting(true);
  }, []);

  const endInteraction = useCallback(() => {
    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current);
    }

    restoreTimerRef.current = setTimeout(() => {
      restoreTimerRef.current = null;

      if (!isModelInteractingRef.current) {
        return;
      }

      isModelInteractingRef.current = false;
      setIsModelInteracting(false);
    }, INTERACTION_RESTORE_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
      }
    };
  }, []);

  const events = useMemo(
    () => ({
      ...controlEvents,
      onStartShouldSetResponder(event: GestureResponderEvent) {
        const shouldStart = controlEvents.onStartShouldSetResponder(event);
        if (shouldStart) {
          beginInteraction();
        }
        return shouldStart;
      },
      onMoveShouldSetResponder(event: GestureResponderEvent) {
        const shouldStart = controlEvents.onMoveShouldSetResponder(event);
        if (shouldStart) {
          beginInteraction();
        }
        return shouldStart;
      },
      onResponderMove(event: GestureResponderEvent) {
        beginInteraction();
        controlEvents.onResponderMove(event);
      },
      onResponderRelease() {
        controlEvents.onResponderRelease();
        endInteraction();
      },
      onResponderTerminate() {
        controlEvents.onResponderRelease();
        endInteraction();
      },
    }),
    [beginInteraction, controlEvents, endInteraction],
  );

  const canvasChildren = useMemo(
    () => (
      <>
        <ambientLight intensity={0.65} />
        <directionalLight intensity={1.1} position={[4, 6, 3]} />
        <OrbitControls enablePan={false} dampingFactor={0.28} />
        <BuildGuideScene bundle={bundle} stepIndex={stepIndex} mode={mode} />
      </>
    ),
    [OrbitControls, bundle, mode, stepIndex],
  );

  return (
    <View style={styles.container} {...events}>
      <FiberCanvas
        style={styles.canvas}
        camera={camera}
        scene={scene}
        renderQuality={renderQuality}
      >
        {canvasChildren}
      </FiberCanvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
