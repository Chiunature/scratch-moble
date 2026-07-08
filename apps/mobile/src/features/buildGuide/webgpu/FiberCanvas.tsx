import * as THREE from 'three';
import React, { useEffect, useRef, useState } from 'react';
import {
  extend,
  createRoot,
  unmountComponentAtNode,
  events,
} from '@react-three/fiber';
import type { ReconcilerRoot, RootState } from '@react-three/fiber';
import type { ViewProps } from 'react-native';
import { PixelRatio } from 'react-native';
import type { CanvasRef } from 'react-native-webgpu';
import { Canvas } from 'react-native-webgpu';

import { makeWebGPURenderer } from './makeWebGPURenderer';

interface WebGpuCanvasElement {
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
}

interface FiberCanvasProps {
  children: React.ReactNode;
  style?: ViewProps['style'];
  camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  scene?: THREE.Scene;
}

export function FiberCanvas({
  children,
  style,
  scene,
  camera,
}: FiberCanvasProps) {
  const root = useRef<ReconcilerRoot<WebGpuCanvasElement> | null>(null);
  const mountedCanvasRef = useRef<WebGpuCanvasElement | null>(null);
  const rendererRef = useRef<RootState['gl'] | null>(null);
  const [ready, setReady] = useState(false);

  React.useMemo(() => {
    // @ts-expect-error WebGPU three bundle shape differs from @types/three catalogue
    extend(THREE);
  }, []);

  const canvasRef = useRef<CanvasRef>(null);

  useEffect(() => {
    let cancelled = false;
    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      return;
    }

    const setup = async () => {
      let context;
      try {
        context = canvasElement.getContext('webgpu');
      } catch {
        return;
      }

      if (!context || cancelled) {
        return;
      }

      const renderer = makeWebGPURenderer(context);
      renderer.setClearColor(0xffffff, 1);
      const canvas = context.canvas as unknown as WebGpuCanvasElement;
      canvas.width = canvas.clientWidth * PixelRatio.get();
      canvas.height = canvas.clientHeight * PixelRatio.get();

      await renderer.init();
      if (cancelled) {
        return;
      }

      const renderFrame = renderer.render.bind(renderer);
      renderer.render = (
        sceneToRender: THREE.Scene,
        cameraToRender: THREE.Camera,
      ) => {
        renderFrame(sceneToRender, cameraToRender);
        context.present();
      };

      mountedCanvasRef.current = canvas;
      rendererRef.current = renderer as unknown as RootState['gl'];

      if (!root.current) {
        root.current = createRoot(canvas);
      }

      setReady(true);
    };

    setup();

    return () => {
      cancelled = true;
      setReady(false);

      const canvas = mountedCanvasRef.current;
      if (canvas != null) {
        unmountComponentAtNode(canvas);
      }

      mountedCanvasRef.current = null;
      rendererRef.current = null;
      root.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !root.current || !mountedCanvasRef.current || !rendererRef.current) {
      return;
    }

    const canvas = mountedCanvasRef.current;
    root.current.configure({
      size: {
        top: 0,
        left: 0,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      },
      events,
      scene,
      camera,
      gl: rendererRef.current,
      frameloop: 'always',
      dpr: 1,
    });
    root.current.render(children);
  }, [ready, camera, children, scene]);

  return <Canvas ref={canvasRef} style={style} />;
}
