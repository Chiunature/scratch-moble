import * as THREE from 'three';

type WebGPURendererInstance = THREE.WebGLRenderer & {
  init(): Promise<void>;
};

type ThreeWebGpuModule = typeof THREE & {
  WebGPURenderer: new (params: {
    antialias?: boolean;
    canvas: OffscreenCanvas;
    context: GPUCanvasContext;
  }) => WebGPURendererInstance;
};

export function makeWebGPURenderer(
  context: GPUCanvasContext,
  { antialias = true }: { antialias?: boolean } = {},
) {
  const three = THREE as ThreeWebGpuModule;

  return new three.WebGPURenderer({
    antialias,
    canvas: context.canvas,
    context,
  });
}

export type { WebGPURendererInstance };
