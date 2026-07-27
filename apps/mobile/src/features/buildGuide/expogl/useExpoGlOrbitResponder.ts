import { useCallback, useMemo, useRef } from 'react';
import {
  PanResponder,
  type GestureResponderEvent,
} from 'react-native';
import * as THREE from 'three';

import type { BuildGuideCamera, CanvasLayoutSize } from './glTypes';
import {
  applyOrbitDamping,
  ORBIT_EPSILON,
  type OrbitState,
} from './orbitState';

type MutableRef<T> = { current: T };

type GestureState = {
  x: number;
  y: number;
  distance: number;
};

type UseExpoGlOrbitResponderParams = {
  cameraRef: MutableRef<BuildGuideCamera>;
  orbitRef: MutableRef<OrbitState>;
  layoutSizeRef: MutableRef<CanvasLayoutSize | null>;
  renderFrame: () => void;
};

const MIN_TOUCH_DISTANCE = 8;

function distanceBetweenTouches(event: GestureResponderEvent): number {
  const [first, second] = event.nativeEvent.touches;
  if (!first || !second) {
    return 0;
  }

  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
}

function getPrimaryTouchPosition(
  event: GestureResponderEvent,
): { x: number; y: number } | null {
  const touch =
    event.nativeEvent.touches[0] ?? event.nativeEvent.changedTouches[0];
  if (!touch) {
    return null;
  }

  return { x: touch.pageX, y: touch.pageY };
}

export function useExpoGlOrbitResponder({
  cameraRef,
  orbitRef,
  layoutSizeRef,
  renderFrame,
}: UseExpoGlOrbitResponderParams) {
  const gestureRef = useRef<GestureState | null>(null);
  const orbitRafRef = useRef<number | null>(null);

  const stopOrbitLoop = useCallback(() => {
    if (orbitRafRef.current != null) {
      cancelAnimationFrame(orbitRafRef.current);
      orbitRafRef.current = null;
    }
  }, []);

  const resetGesture = useCallback(() => {
    gestureRef.current = null;
  }, []);

  const ensureOrbitLoop = useCallback(() => {
    if (orbitRafRef.current != null) {
      return;
    }

    const tick = () => {
      const moved = applyOrbitDamping(orbitRef.current);
      renderFrame();
      if (moved) {
        orbitRafRef.current = requestAnimationFrame(tick);
        return;
      }
      orbitRafRef.current = null;
    };

    orbitRafRef.current = requestAnimationFrame(tick);
  }, [orbitRef, renderFrame]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant(event) {
          const position = getPrimaryTouchPosition(event);
          gestureRef.current = position
            ? { ...position, distance: distanceBetweenTouches(event) }
            : null;
        },
        onPanResponderMove(event) {
          const previous = gestureRef.current;
          const position = getPrimaryTouchPosition(event);
          if (!previous || !position) {
            return;
          }

          const distance = distanceBetweenTouches(event);
          if (
            distance > MIN_TOUCH_DISTANCE &&
            previous.distance > MIN_TOUCH_DISTANCE
          ) {
            const ratio = distance / previous.distance;
            if (cameraRef.current instanceof THREE.PerspectiveCamera) {
              orbitRef.current.radius = Math.max(
                ORBIT_EPSILON,
                orbitRef.current.radius / ratio,
              );
            } else {
              orbitRef.current.zoom = Math.max(
                ORBIT_EPSILON,
                orbitRef.current.zoom * ratio,
              );
            }
            gestureRef.current = { ...position, distance };
            renderFrame();
            return;
          }

          const height = layoutSizeRef.current?.height ?? 0;
          if (height > 0) {
            const dx = position.x - previous.x;
            const dy = position.y - previous.y;
            orbitRef.current.thetaDelta -= (2 * Math.PI * dx) / height;
            orbitRef.current.phiDelta -= (2 * Math.PI * dy) / height;
            ensureOrbitLoop();
          }

          gestureRef.current = { ...position, distance };
        },
        onPanResponderRelease() {
          resetGesture();
          ensureOrbitLoop();
        },
        onPanResponderTerminate() {
          resetGesture();
          ensureOrbitLoop();
        },
      }),
    [
      cameraRef,
      ensureOrbitLoop,
      layoutSizeRef,
      orbitRef,
      renderFrame,
      resetGesture,
    ],
  );

  return {
    panHandlers: panResponder.panHandlers,
    resetGesture,
    stopOrbitLoop,
  };
}