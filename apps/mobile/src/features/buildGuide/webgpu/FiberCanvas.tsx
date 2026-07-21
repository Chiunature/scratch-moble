/**
 * R3F + react-native-webgpu 画布桥接。
 *
 * 结构对齐 Expo 官方 with-webgpu 模板：
 * https://github.com/expo/examples/tree/master/with-webgpu
 * 差异：先 await renderer.init()；dpr 超采样（2× 封顶 4）+ MSAA4。
 */
import * as THREE from 'three/webgpu';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReconcilerRoot, RootState } from '@react-three/fiber';
import {
  extend,
  createRoot,
  unmountComponentAtNode,
  events,
} from '@react-three/fiber';
import type { LayoutChangeEvent, ViewProps } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-webgpu';

import {
  getRenderDpr,
  makeWebGPURenderer,
  type RenderQuality,
} from './makeWebGPURenderer';

type CanvasLayoutSize = {
  width: number;
  height: number;
};

type PixelRatioRenderer = RootState['gl'] & {
  setPixelRatio(pixelRatio: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
};

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
  renderQuality?: RenderQuality;
}

export const FiberCanvas = ({
  children,
  style,
  scene,
  camera,
  renderQuality = 'default',
}: FiberCanvasProps) => {
  const root = useRef<ReconcilerRoot<WebGpuCanvasElement> | null>(null);
  const mountedCanvasRef = useRef<WebGpuCanvasElement | null>(null);
  const rendererRef = useRef<RootState['gl'] | null>(null);
  const renderQualityRef = useRef(renderQuality);
  const [ready, setReady] = useState(false);
  const [layoutSize, setLayoutSize] = useState<CanvasLayoutSize | null>(null);

  // @ts-expect-error WebGPU three bundle shape differs from @types/three catalogue
  React.useMemo(() => extend(THREE), []);

  const canvasRef = useRef<CanvasRef>(null);

  useEffect(() => {
    renderQualityRef.current = renderQuality;
  }, [renderQuality]);

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

      const renderer = makeWebGPURenderer(context, {
        antialias: true,
        samples: 4,
      });
      renderer.setClearColor(0xffffff, 1);
      const canvas = context.canvas as unknown as WebGpuCanvasElement;

      await renderer.init();
      if (cancelled) {
        return;
      }

      // 官方模板：每帧 render 后必须 context.present()
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
      !rendererRef.current ||
      !layoutSize
    ) {
      return;
    }

    root.current.configure({
      size: {
        top: 0,
        left: 0,
        width: layoutSize.width,
        height: layoutSize.height,
      },
      events,
      scene,
      camera,
      gl: rendererRef.current,
      frameloop: 'always',
      // 固定 default dpr；勿随 interaction 重跑 configure，否则正交相机取景会跳变
      dpr: getRenderDpr('default'),
    });
    root.current.render(children);
  }, [ready, camera, children, layoutSize, scene]);

  useEffect(() => {
    if (!ready || !rendererRef.current || !layoutSize) {
      return;
    }

    const renderer = rendererRef.current as PixelRatioRenderer;
    renderer.setPixelRatio(getRenderDpr(renderQualityRef.current));
    renderer.setSize(layoutSize.width, layoutSize.height, false);
  }, [layoutSize, ready]);

  useEffect(() => {
    if (!ready || !rendererRef.current) {
      return;
    }

    // 交互降采样只改 pixelRatio，不调 setSize（避免 ortho 视锥被重算导致模型突然放大）
    const renderer = rendererRef.current as PixelRatioRenderer;
    renderer.setPixelRatio(getRenderDpr(renderQuality));
  }, [ready, renderQuality]);

  return <Canvas ref={canvasRef} style={style} onLayout={handleLayout} />;
};
