import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PixelRatio,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

import { resolveStepViewModel } from '@scratch-mobile/build-guide';
import type { LdrDisplayMode } from '@scratch-mobile/ldr-engine';

import type { StepAnimationMode } from '../settings';
import type { BuildGuideBundle } from '../types';
import {
  disposeUploadedFrame,
  drawUploadedFrame,
  resolveRenderSize,
} from './glFrameRenderer';
import { createProgram, disposeProgram } from './glProgram';
import type {
  BuildGuideCamera,
  CanvasLayoutSize,
  ExpoGlRuntimeContext,
  RawGlProgram,
  RenderSize,
  UploadedFrame,
} from './glTypes';
import {
  applyOrbitToCamera,
  createOrbitState,
  type OrbitState,
} from './orbitState';
import { formatRuntimeError } from './runtimeError';
import { useExpoGlOrbitResponder } from './useExpoGlOrbitResponder';
import { useExpoGlStepScene } from './useExpoGlStepScene';

type BuildGuideExpoGlCanvasProps = {
  bundle: BuildGuideBundle;
  stepIndex: number;
  animationMode: StepAnimationMode;
  appearanceRevision: number;
};

const _identityMatrix = new THREE.Matrix4();

function createBuildGuideCamera(mode: LdrDisplayMode): BuildGuideCamera {
  if (mode === 'preview') {
    return new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  }

  return new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
}

function resolveDisplayMode(bundle: BuildGuideBundle): LdrDisplayMode {
  return bundle.model?.mode ?? bundle.manifest.mode ?? 'instruction';
}

export function BuildGuideExpoGlCanvas({
  bundle,
  stepIndex,
  animationMode,
  appearanceRevision,
}: BuildGuideExpoGlCanvasProps) {
  const mode = resolveDisplayMode(bundle);
  const totalSteps = bundle.stepHandler?.getTotalSteps() ?? 0;
  const step = useMemo(
    () =>
      bundle.stepHandler
        ? resolveStepViewModel(bundle.manifest, stepIndex, totalSteps)
        : undefined,
    [bundle.manifest, bundle.stepHandler, stepIndex, totalSteps],
  );
  const camera = useMemo(() => createBuildGuideCamera(mode), [mode]);
  const cameraRef = useRef<BuildGuideCamera>(camera);
  const rootRef = useRef<THREE.Object3D | null>(null);
  const glRef = useRef<ExpoGlRuntimeContext | null>(null);
  const programRef = useRef<RawGlProgram | null>(null);
  const uploadedFrameRef = useRef<UploadedFrame | null>(null);
  const renderSizeRef = useRef<RenderSize | null>(null);
  const renderFailedRef = useRef(false);
  const orbitRef = useRef<OrbitState>(createOrbitState());
  const orbitTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const layoutSizeRef = useRef<CanvasLayoutSize | null>(null);
  const [layoutSize, setLayoutSize] = useState<CanvasLayoutSize | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    layoutSizeRef.current = layoutSize;
  }, [layoutSize]);

  const renderFrame = useCallback(() => {
    if (renderFailedRef.current) {
      return;
    }

    const gl = glRef.current;
    const program = programRef.current;
    const size = renderSizeRef.current;
    if (!gl || !program || !size) {
      return;
    }

    try {
      const root = rootRef.current;
      if (root) {
        root.updateMatrixWorld(true);
      }
      applyOrbitToCamera(
        cameraRef.current,
        orbitTargetRef.current,
        orbitRef.current,
      );
      drawUploadedFrame(
        gl,
        program,
        uploadedFrameRef.current,
        cameraRef.current,
        size,
        root?.matrixWorld ?? _identityMatrix,
      );
    } catch (cause: unknown) {
      renderFailedRef.current = true;
      setRenderError(formatRuntimeError(cause));
    }
  }, []);

  const { panHandlers, resetGesture, stopOrbitLoop } = useExpoGlOrbitResponder(
    {
      cameraRef,
      orbitRef,
      layoutSizeRef,
      renderFrame,
    },
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }

    setLayoutSize(current =>
      current?.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);

  const handleContextCreate = useCallback(
    (context: ExpoWebGLRenderingContext) => {
      const gl = context as ExpoGlRuntimeContext;
      const initialSize = layoutSize ?? {
        width: Math.max(1, gl.drawingBufferWidth / PixelRatio.get()),
        height: Math.max(1, gl.drawingBufferHeight / PixelRatio.get()),
      };

      try {
        const program = createProgram(gl);
        glRef.current = gl;
        programRef.current = program;
        renderSizeRef.current = resolveRenderSize(gl, initialSize);
        renderFailedRef.current = false;
        setRenderError(null);
        setContextReady(true);
        renderFrame();
      } catch (cause: unknown) {
        renderFailedRef.current = true;
        setRenderError(formatRuntimeError(cause));
      }
    },
    [layoutSize, renderFrame],
  );

  useExpoGlStepScene({
    bundle,
    step,
    stepIndex,
    mode,
    camera,
    contextReady,
    layoutSize,
    animationMode,
    appearanceRevision,
    glRef,
    rootRef,
    uploadedFrameRef,
    renderSizeRef,
    renderFailedRef,
    orbitRef,
    orbitTargetRef,
    renderFrame,
    stopOrbitLoop,
    resetGesture,
    setRenderError,
  });

  useEffect(
    () => () => {
      stopOrbitLoop();
      const gl = glRef.current;
      if (gl) {
        disposeUploadedFrame(gl, uploadedFrameRef.current);
        uploadedFrameRef.current = null;
        disposeProgram(gl, programRef.current);
      }

      programRef.current = null;
      rootRef.current = null;
      glRef.current = null;
      renderSizeRef.current = null;
      setContextReady(false);
    },
    [stopOrbitLoop],
  );

  return (
    <View style={styles.container} onLayout={handleLayout} {...panHandlers}>
      <GLView
        style={styles.canvas}
        msaaSamples={4}
        onContextCreate={handleContextCreate}
      />
      {renderError ? (
        <View pointerEvents="none" style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Expo GL renderer failed</Text>
          <Text style={styles.errorMessage}>{renderError}</Text>
        </View>
      ) : null}
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
  errorMessage: {
    color: '#fecaca',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    textAlign: 'center',
  },
  errorOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.82)',
    borderRadius: 12,
    left: 16,
    padding: 12,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});