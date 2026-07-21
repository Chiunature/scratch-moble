/**
 * R3F + react-native-webgpu 画布桥接。
 *
 * 结构对齐 Expo 官方 with-webgpu 模板（src/lib/fiber-canvas.tsx）：
 * https://github.com/expo/examples/tree/master/with-webgpu
 * 差异（有意保留）：
 * - 先 await renderer.init() 再 configure，避免 render-before-init 报错
 * - dpr 用 getRenderDpr() 超采样（官方为 1）
 * - 后处理深度/颜色描边（createLdrOutlinePipeline），替代 LineSegments
 *
 * 分辨率 / 抗锯齿：通过 configure({ dpr }) 交给 Three.js 管理，
 * 不要在这里手动设置 canvas.width（会与 renderer 内部状态不一致）。
 * 画质参数见 makeWebGPURenderer.ts。
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
import {
  createLdrOutlinePipeline,
  type LdrOutlineHandles,
} from './createLdrOutlinePipeline';

/** 后处理描边；若真机异常可改 false 回退普通 render */
const ENABLE_OUTLINE_POSTPROCESS = true;

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
  const outlineRef = useRef<LdrOutlineHandles | null>(null);
  const outlineBindRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.Camera | null;
  }>({ scene: null, camera: null });
  const layoutSizeRef = useRef<CanvasLayoutSize | null>(null);
  const renderQualityRef = useRef(renderQuality);
  const [ready, setReady] = useState(false);
  const [layoutSize, setLayoutSize] = useState<CanvasLayoutSize | null>(null);

  // @ts-expect-error WebGPU three bundle shape differs from @types/three catalogue
  React.useMemo(() => extend(THREE), []);

  const canvasRef = useRef<CanvasRef>(null);

  useEffect(() => {
    renderQualityRef.current = renderQuality;
  }, [renderQuality]);

  useEffect(() => {
    layoutSizeRef.current = layoutSize;
  }, [layoutSize]);

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

      // 后处理描边期间关 MSAA，避免 depth resolve 异常；描边本身提供边缘清晰度
      const renderer = makeWebGPURenderer(context, {
        antialias: false,
        samples: 1,
      });
      renderer.setClearColor(0xffffff, 1);
      const canvas = context.canvas as unknown as WebGpuCanvasElement;

      await renderer.init();
      if (cancelled) {
        return;
      }

      const syncOutlineSize = () => {
        const size = layoutSizeRef.current;
        if (!size || !outlineRef.current) {
          return;
        }
        outlineRef.current.setSize(
          size.width,
          size.height,
          getRenderDpr(renderQualityRef.current),
        );
      };

      const ensureOutline = (
        sceneToRender: THREE.Scene,
        cameraToRender: THREE.Camera,
      ) => {
        if (!ENABLE_OUTLINE_POSTPROCESS) {
          return null;
        }

        const bind = outlineBindRef.current;
        if (
          outlineRef.current &&
          bind.scene === sceneToRender &&
          bind.camera === cameraToRender
        ) {
          return outlineRef.current;
        }

        outlineRef.current?.dispose();
        outlineRef.current = createLdrOutlinePipeline(
          renderer,
          sceneToRender,
          cameraToRender,
        );
        bind.scene = sceneToRender;
        bind.camera = cameraToRender;
        syncOutlineSize();
        return outlineRef.current;
      };

      // 官方模板：每帧 render 后必须 context.present()
      // PassNode 内部会再调 renderer.render(scene, camera)；若此处不解开包装会无限递归
      const renderFrame = renderer.render.bind(renderer);
      const renderWithOutline = (
        sceneToRender: THREE.Scene,
        cameraToRender: THREE.Camera,
      ) => {
        const outline = ensureOutline(sceneToRender, cameraToRender);
        if (outline) {
          renderer.render = renderFrame;
          try {
            outline.pipeline.render();
          } finally {
            renderer.render = renderWithOutline;
          }
        } else {
          renderFrame(sceneToRender, cameraToRender);
        }
        context.present();
      };
      renderer.render = renderWithOutline;

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

      outlineRef.current?.dispose();
      outlineRef.current = null;
      outlineBindRef.current = { scene: null, camera: null };

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
      dpr: getRenderDpr(),
    });
    root.current.render(children);
  }, [ready, camera, children, layoutSize, scene]);

  useEffect(() => {
    if (!ready || !rendererRef.current || !layoutSize) {
      return;
    }

    const renderer = rendererRef.current as PixelRatioRenderer;
    const dpr = getRenderDpr(renderQuality);
    renderer.setPixelRatio(dpr);
    renderer.setSize(layoutSize.width, layoutSize.height, false);
    outlineRef.current?.setSize(layoutSize.width, layoutSize.height, dpr);
  }, [layoutSize, ready, renderQuality]);

  return <Canvas ref={canvasRef} style={style} onLayout={handleLayout} />;
};
