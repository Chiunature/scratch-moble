import * as THREE from 'three';
import React, { useEffect, useRef } from 'react';
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
  camera?: THREE.PerspectiveCamera;
  scene?: THREE.Scene;
}

export function FiberCanvas({
  children,
  style,
  scene,
  camera,
}: FiberCanvasProps) {
  const root = useRef<ReconcilerRoot<WebGpuCanvasElement>>(null!);
  React.useMemo(() => {
    // three.webgpu build is compatible at runtime but not typed for R3F extend().
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
      const context = canvasElement.getContext('webgpu');
      if (!context) {
        return;
      }

      const renderer = makeWebGPURenderer(context);
      const canvas = context.canvas as unknown as WebGpuCanvasElement;
      canvas.width = canvas.clientWidth * PixelRatio.get();
      canvas.height = canvas.clientHeight * PixelRatio.get();

      await renderer.init();
      if (cancelled) {
        return;
      }

      const renderFrame = renderer.render.bind(renderer);
      renderer.render = (sceneToRender: THREE.Scene, cameraToRender: THREE.Camera) => {
        renderFrame(sceneToRender, cameraToRender);
        context.present();
      };

      const size = {
        top: 0,
        left: 0,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      };

      if (!root.current) {
        root.current = createRoot(canvas);
      }

      root.current.configure({
        size,
        events,
        scene,
        camera,
        gl: renderer as unknown as RootState['gl'],
        frameloop: 'always',
        dpr: 1,
      });
      root.current.render(children);
    };

    void setup();

    return () => {
      cancelled = true;
      const canvas = canvasRef.current?.getContext('webgpu')?.canvas as
        | WebGpuCanvasElement
        | undefined;
      if (canvas != null) {
        unmountComponentAtNode(canvas);
      }
    };
  }, [camera, children, scene]);

  return <Canvas ref={canvasRef} style={style} />;
}
