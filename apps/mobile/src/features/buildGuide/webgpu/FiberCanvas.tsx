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

// WebGPU Canvas 元素的结构，包含尺寸相关属性
interface WebGpuCanvasElement {
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
}

interface FiberCanvasProps {
  children: React.ReactNode; // 3D 场景的子元素
  style?: ViewProps['style']; // 样式
  camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera; // 相机
  scene?: THREE.Scene; // 场景
}

// FiberCanvas 组件，用于渲染 3D 场景,桥接层
export function FiberCanvas({
  children,
  style,
  scene,
  camera,
}: FiberCanvasProps) {
  const root = useRef<ReconcilerRoot<WebGpuCanvasElement>>(null!);
  React.useMemo(() => {
    // 将 Three.js 的 WebGPU 构建注册到 R3F 的扩展系统
    // @ts-expect-error 因为类型不兼容
    extend(THREE);
  }, []);
  const canvasRef = useRef<CanvasRef>(null);

  useEffect(() => {
    let cancelled = false; //竞态条件保护，防止在已卸载组件上执行操作
    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      return;
    }

    const setup = async () => {
      // 初始化渲染器和场景
      const context = canvasElement.getContext('webgpu'); //获取WebGPU上下文给rn
      if (!context) {
        return;
      }
      // 将 WebGPU 上下文包装成 Three.js 渲染器
      const renderer = makeWebGPURenderer(context);
      renderer.setClearColor(0xffffff, 1); //设置背景颜色为白色
      const canvas = context.canvas as unknown as WebGpuCanvasElement;
      canvas.width = canvas.clientWidth * PixelRatio.get(); //计算实际渲染像素
      canvas.height = canvas.clientHeight * PixelRatio.get(); //计算实际渲染像素

      await renderer.init(); //初始化渲染器
      if (cancelled) {
        //竞态条件保护，防止在已卸载组件上执行操作
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
        size, //画布尺寸
        events, //事件系统
        scene, //场景（可选）
        camera, //相机（可选）
        gl: renderer as unknown as RootState['gl'], //WebGPU 渲染器
        frameloop: 'always', //持续渲染
        dpr: 1, //设备像素比
      });
      root.current.render(children); //渲染场景
    };

    setup();

    return () => {
      cancelled = true;
      const canvas = canvasElement.getContext('webgpu')?.canvas as
        | WebGpuCanvasElement
        | undefined;
      if (canvas != null) {
        unmountComponentAtNode(canvas);
      }
    };
  }, [camera, children, scene]);

  return <Canvas ref={canvasRef} style={style} />;
}
