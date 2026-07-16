/**
 * BuildGuide WebGPU 渲染器工厂。
 *
 * 结构对齐 Expo 官方 with-webgpu 模板（src/lib/make-webgpu-renderer.ts）：
 * https://github.com/expo/examples/tree/master/with-webgpu
 * 差异：保留 samples（MSAA）参数与 getRenderDpr 超采样。
 *
 * 画质相关有两层：
 * 1. MSAA（samples）—— 平滑三角面边缘，对 LDraw 1px 描边帮助有限
 * 2. 超采样（getRenderDpr）—— 提高渲染分辨率，整体更清晰
 *
 * 后续调画质：
 * - 默认清晰度：调 RENDER_DPR_PROFILES.default
 * - 交互顺滑度：调 RENDER_DPR_PROFILES.interaction
 * - samples 在 Three.js r185 实际固定为 4，改 samples 参数暂无更大 MSAA
 */
import * as THREE from 'three/webgpu';
import { PixelRatio } from 'react-native';
import type { NativeCanvas } from 'react-native-webgpu';

export type RenderQuality = 'default' | 'interaction';

type RenderDprProfile = {
  supersample: number;
  maxDpr: number;
};

const RENDER_DPR_PROFILES: Record<RenderQuality, RenderDprProfile> = {
  default: {
    supersample: 2,
    maxDpr: 4,
  },
  interaction: {
    supersample: 1.6,
    maxDpr: 3.2,
  },
};

/** 供 R3F configure({ dpr }) 使用，勿手动改 canvas.width */
export function getRenderDpr(quality: RenderQuality = 'default'): number {
  const profile = RENDER_DPR_PROFILES[quality];
  return Math.min(PixelRatio.get() * profile.supersample, profile.maxDpr);
}

/**
 * 官方模板同款：把原生 canvas 包成非 host object，
 * 避免 Three.js 直接读写 JSI host object 的属性。
 */
export class ReactNativeCanvas {
  constructor(private canvas: NativeCanvas) {}

  get width() {
    return this.canvas.width;
  }

  set width(width: number) {
    this.canvas.width = width;
  }

  get height() {
    return this.canvas.height;
  }

  set height(height: number) {
    this.canvas.height = height;
  }

  get clientWidth() {
    return this.canvas.width;
  }

  set clientWidth(width: number) {
    this.canvas.width = width;
  }

  get clientHeight() {
    return this.canvas.height;
  }

  set clientHeight(height: number) {
    this.canvas.height = height;
  }

  addEventListener(_type: string, _listener: unknown) {}

  removeEventListener(_type: string, _listener: unknown) {}

  dispatchEvent(_event: unknown) {}

  setPointerCapture() {}

  releasePointerCapture() {}
}

export type WebGPURendererOptions = {
  antialias?: boolean;
  /** MSAA 采样数；antialias 为 true 时 Three.js 默认 4 */
  samples?: number;
};

export function makeWebGPURenderer(
  context: GPUCanvasContext,
  { antialias = true, samples = 4 }: WebGPURendererOptions = {},
): THREE.WebGPURenderer {
  return new THREE.WebGPURenderer({
    antialias,
    samples,
    canvas: new ReactNativeCanvas(
      context.canvas as unknown as NativeCanvas,
    ) as unknown as OffscreenCanvas,
    context,
  });
}
