/**
 * LDraw 说明书用后处理描边（WebGPU / TSL）。
 *
 * 观感目标：接近纸质说明书的细灰描边，而不是硬黑描边。
 * - 以深度轮廓为主，颜色边只作弱补充
 * - 用「压暗局部颜色」代替纯黑填充，更自然
 * - 边缘因子做邻域软化，减轻锯齿感
 */
import * as THREE from 'three/webgpu';
import {
  Fn,
  abs,
  add,
  float,
  luminance,
  max,
  mix,
  pass,
  renderOutput,
  smoothstep,
  uniform,
  uv,
  vec2,
  vec4,
} from 'three/tsl';

export type LdrOutlineHandles = {
  pipeline: THREE.RenderPipeline;
  setSize: (width: number, height: number, pixelRatio: number) => void;
  dispose: () => void;
};

export type LdrOutlineOptions = {
  depthThreshold?: number;
  colorThreshold?: number;
  /** 描边强度 0–1 */
  edgeStrength?: number;
  /** 压暗程度：1=压到近黑，0.35=只略加深 */
  darkenAmount?: number;
};

export function createLdrOutlinePipeline(
  renderer: THREE.WebGPURenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: LdrOutlineOptions = {},
): LdrOutlineHandles {
  const invSize = uniform(new THREE.Vector2(1, 1));
  // 略宽容的深度阈值 + 很宽的 smoothstep → 软边
  const depthThreshold = uniform(options.depthThreshold ?? 0.0065);
  const colorThreshold = uniform(options.colorThreshold ?? 0.22);
  const edgeStrength = uniform(options.edgeStrength ?? 0.55);
  const darkenAmount = uniform(options.darkenAmount ?? 0.62);

  const scenePass = pass(scene, camera);
  const colorNode = scenePass.getTextureNode('output');
  const depthNode = scenePass.getTextureNode('depth');

  const outlined = Fn(() => {
    const uvNode = uv();
    const texel = invSize;

    const depthAt = (ox: number, oy: number) =>
      depthNode.sample(uvNode.add(texel.mul(vec2(ox, oy)))).x;

    const lumAt = (ox: number, oy: number) =>
      luminance(colorNode.sample(uvNode.add(texel.mul(vec2(ox, oy)))).rgb);

    // 8 邻域深度梯度，轮廓更稳
    const d = depthAt(0, 0);
    const depthEdge = max(
      abs(d.sub(depthAt(-1, 0))),
      abs(d.sub(depthAt(1, 0))),
      abs(d.sub(depthAt(0, -1))),
      abs(d.sub(depthAt(0, 1))),
      abs(d.sub(depthAt(-1, -1))).mul(0.7),
      abs(d.sub(depthAt(1, -1))).mul(0.7),
      abs(d.sub(depthAt(-1, 1))).mul(0.7),
      abs(d.sub(depthAt(1, 1))).mul(0.7),
    );

    const l = lumAt(0, 0);
    const colorEdge = max(
      abs(l.sub(lumAt(-1, 0))),
      abs(l.sub(lumAt(1, 0))),
      abs(l.sub(lumAt(0, -1))),
      abs(l.sub(lumAt(0, 1))),
    );

    // 很宽的过渡带 → 抗锯齿软边
    const depthFactor = smoothstep(
      depthThreshold.mul(0.15),
      depthThreshold.mul(1.35),
      depthEdge,
    );
    const colorFactor = smoothstep(
      colorThreshold.mul(0.4),
      colorThreshold.mul(1.2),
      colorEdge,
    );

    // 深度主导；颜色边很弱，只补异色零件交界
    const rawEdge = max(depthFactor, colorFactor.mul(0.28));

    // 3x3 盒式软化边缘 mask，减少「毛刺线」
    const softenAt = (ox: number, oy: number) => {
      const dd = depthAt(ox, oy);
      const localDepthEdge = max(
        abs(dd.sub(depthAt(ox - 1, oy))),
        abs(dd.sub(depthAt(ox + 1, oy))),
        abs(dd.sub(depthAt(ox, oy - 1))),
        abs(dd.sub(depthAt(ox, oy + 1))),
      );
      return smoothstep(
        depthThreshold.mul(0.15),
        depthThreshold.mul(1.35),
        localDepthEdge,
      );
    };

    const softEdge = add(
      rawEdge.mul(0.36),
      softenAt(-1, 0).mul(0.12),
      softenAt(1, 0).mul(0.12),
      softenAt(0, -1).mul(0.12),
      softenAt(0, 1).mul(0.12),
      softenAt(-1, -1).mul(0.04),
      softenAt(1, -1).mul(0.04),
      softenAt(-1, 1).mul(0.04),
      softenAt(1, 1).mul(0.04),
    ).mul(edgeStrength);

    const color = colorNode.sample(uvNode);
    // 压暗局部颜色，而不是铺纯黑——黄砖上会变成深黄褐边，更像印刷线
    const ink = mix(
      color.rgb,
      color.rgb.mul(float(0.12)),
      darkenAmount,
    );
    const rgb = mix(color.rgb, ink, softEdge);

    return vec4(rgb, color.a);
  })();

  const pipeline = new THREE.RenderPipeline(renderer);
  pipeline.outputColorTransform = false;
  pipeline.outputNode = renderOutput(outlined);

  return {
    pipeline,
    setSize(width, height, pixelRatio) {
      const w = Math.max(1, Math.floor(width * pixelRatio));
      const h = Math.max(1, Math.floor(height * pixelRatio));
      invSize.value.set(1 / w, 1 / h);
    },
    dispose() {
      pipeline.dispose();
    },
  };
}
