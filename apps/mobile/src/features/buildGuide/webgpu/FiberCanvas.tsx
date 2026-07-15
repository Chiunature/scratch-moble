/**
 * R3F + react-native-webgpu 画布桥接。
 *
 * 结构对齐 Expo 官方 with-webgpu 模板（src/lib/fiber-canvas.tsx）：
 * https://github.com/expo/examples/tree/master/with-webgpu
 * 差异（有意保留）：
 * - 先 await renderer.init() 再 configure，避免 render-before-init 报错
 * - dpr 用 getRenderDpr() 超采样（官方为 1）
 * - 白色 clearColor
 *
 * 分辨率 / 抗锯齿：通过 configure({ dpr }) 交给 Three.js 管理，
 * 不要在这里手动设置 canvas.width（会与 renderer 内部状态不一致）。
 * 画质参数见 makeWebGPURenderer.ts。
 */
import * as THREE from 'three/webgpu';
import React, { useEffect, useRef, useState } from 'react';
import type { ReconcilerRoot, RootState } from '@react-three/fiber';
import {
  extend,
  createRoot,
  unmountComponentAtNode,
  events,
} from '@react-three/fiber';
import type { ViewProps } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-webgpu';

import { getRenderDpr, makeWebGPURenderer } from './makeWebGPURenderer';

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

export const FiberCanvas = ({
  children,
  style,
  scene,
  camera,
}: FiberCanvasProps) => {
  const root = useRef<ReconcilerRoot<WebGpuCanvasElement> | null>(null);
  const mountedCanvasRef = useRef<WebGpuCanvasElement | null>(null);
  const rendererRef = useRef<RootState['gl'] | null>(null);
  const [ready, setReady] = useState(false);

  // @ts-expect-error WebGPU three bundle shape differs from @types/three catalogue
  React.useMemo(() => extend(THREE), []);

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

      // MSAA 4x；超采样 dpr 在下方 configure 阶段设置
      const renderer = makeWebGPURenderer(context, {
        antialias: true,
        samples: 4,
      });
      renderer.setClearColor(0xffffff, 1);
      // makeWebGPURenderer 里 ReactNativeCanvas 包装的就是这个 canvas
      const canvas = context.canvas as unknown as WebGpuCanvasElement;

      await renderer.init();
      if (cancelled) {
        return;
      }

      // 官方模板同款：每帧 render 后必须 context.present()
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
    if (
      !ready ||
      !root.current ||
      !mountedCanvasRef.current ||
      !rendererRef.current
    ) {
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
      // R3F 会调用 gl.setPixelRatio + gl.setSize，驱动实际渲染分辨率
      dpr: getRenderDpr(),
    });
    root.current.render(children);
  }, [ready, camera, children, scene]);

  return <Canvas ref={canvasRef} style={style} />;
};
