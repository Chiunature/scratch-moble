/**
 * BuildGuide WebGPU 渲染器工厂。
 *
 * 画质相关有两层：
 * 1. MSAA（samples）—— 平滑三角面边缘，对 LDraw 1px 描边帮助有限
 * 2. 超采样（getRenderDpr）—— 提高渲染分辨率，整体更清晰
 *
 * 后续调画质：
 * - 卡顿：降低 AA_SUPERSAMPLE（如 1.5）或 MAX_RENDER_DPR（如 3）
 * - 仍粗糙：提高 AA_SUPERSAMPLE，但注意 GPU 负载随 dpr² 增长
 * - samples 在 Three.js r185 实际固定为 4，改 samples 参数暂无更大 MSAA
 */
import * as THREE from 'three';
import { PixelRatio } from 'react-native';

/** 在设备像素比之上的超采样倍率 */
const AA_SUPERSAMPLE = 2;
/** 渲染 dpr 上限，防止高分屏（3x）上像素量爆炸 */
const MAX_RENDER_DPR = 4;

/** 供 R3F configure({ dpr }) 使用，勿手动改 canvas.width */
export function getRenderDpr(): number {
  return Math.min(PixelRatio.get() * AA_SUPERSAMPLE, MAX_RENDER_DPR);
}

type WebGPURendererInstance = THREE.WebGLRenderer & {
  init(): Promise<void>;
};

type ThreeWebGpuModule = typeof THREE & {
  WebGPURenderer: new (params: {
    antialias?: boolean;
    samples?: number;
    canvas: OffscreenCanvas;
    context: GPUCanvasContext;
  }) => WebGPURendererInstance;
};

export type WebGPURendererOptions = {
  antialias?: boolean;
  /** MSAA 采样数；antialias 为 true 时 Three.js 默认 4 */
  samples?: number;
};

export function makeWebGPURenderer(
  context: GPUCanvasContext,
  { antialias = true, samples = 4 }: WebGPURendererOptions = {},
) {
  const three = THREE as ThreeWebGpuModule;

  return new three.WebGPURenderer({
    antialias,
    samples,
    canvas: context.canvas,
    context,
  });
}

export type { WebGPURendererInstance };
