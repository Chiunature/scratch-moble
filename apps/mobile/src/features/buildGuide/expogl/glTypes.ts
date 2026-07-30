import type { ExpoWebGLRenderingContext } from 'expo-gl';
import type * as THREE from 'three';

export type BuildGuideCamera =
  | THREE.PerspectiveCamera
  | THREE.OrthographicCamera;

export type CanvasLayoutSize = {
  width: number;
  height: number;
};

export type RenderSize = {
  width: number;
  height: number;
};

// Expo GL exposes WebGL methods at runtime, while React Native TS config omits DOM/WebGL globals.
export type RawGlShader = object;
export type RawGlProgramHandle = object;
export type RawGlBuffer = object;
export type RawGlTexture = object;
export type RawGlFramebuffer = object;
export type RawGlRenderbuffer = object;
export type RawGlUniformLocation = object;

export type ExpoGlRuntimeContext = ExpoWebGLRenderingContext & {
  readonly drawingBufferWidth: number;
  readonly drawingBufferHeight: number;
  readonly ARRAY_BUFFER: number;
  readonly STATIC_DRAW: number;
  readonly TRIANGLES: number;
  readonly LINES: number;
  readonly FLOAT: number;
  readonly CULL_FACE: number;
  readonly DEPTH_TEST: number;
  readonly LEQUAL: number;
  readonly COLOR_BUFFER_BIT: number;
  readonly DEPTH_BUFFER_BIT: number;
  readonly BLEND: number;
  readonly SRC_ALPHA: number;
  readonly ONE_MINUS_SRC_ALPHA: number;
  readonly VERTEX_SHADER: number;
  readonly FRAGMENT_SHADER: number;
  readonly COMPILE_STATUS: number;
  readonly LINK_STATUS: number;
  readonly POLYGON_OFFSET_FILL: number;
  readonly FRAMEBUFFER: number;
  readonly COLOR_ATTACHMENT0: number;
  readonly TEXTURE_2D: number;
  readonly TEXTURE0: number;
  readonly TEXTURE_MIN_FILTER: number;
  readonly TEXTURE_MAG_FILTER: number;
  readonly TEXTURE_WRAP_S: number;
  readonly TEXTURE_WRAP_T: number;
  readonly LINEAR: number;
  readonly CLAMP_TO_EDGE: number;
  readonly RGBA: number;
  readonly UNSIGNED_BYTE: number;
  readonly RENDERBUFFER: number;
  readonly DEPTH_COMPONENT16: number;
  readonly DEPTH_ATTACHMENT: number;
  readonly FRAMEBUFFER_COMPLETE: number;
  viewport(x: number, y: number, width: number, height: number): void;
  createShader(type: number): RawGlShader | null;
  shaderSource(shader: RawGlShader, source: string): void;
  compileShader(shader: RawGlShader): void;
  getShaderParameter(shader: RawGlShader, pname: number): unknown;
  getShaderInfoLog(shader: RawGlShader): string | null;
  deleteShader(shader: RawGlShader | null): void;
  createProgram(): RawGlProgramHandle | null;
  attachShader(program: RawGlProgramHandle, shader: RawGlShader): void;
  linkProgram(program: RawGlProgramHandle): void;
  getProgramParameter(program: RawGlProgramHandle, pname: number): unknown;
  getProgramInfoLog(program: RawGlProgramHandle): string | null;
  deleteProgram(program: RawGlProgramHandle | null): void;
  getAttribLocation(program: RawGlProgramHandle, name: string): number;
  getUniformLocation(
    program: RawGlProgramHandle,
    name: string,
  ): RawGlUniformLocation | null;
  createBuffer(): RawGlBuffer | null;
  deleteBuffer(buffer: RawGlBuffer | null): void;
  bindBuffer(target: number, buffer: RawGlBuffer | null): void;
  bufferData(target: number, data: Float32Array, usage: number): void;
  createTexture(): RawGlTexture | null;
  deleteTexture(texture: RawGlTexture | null): void;
  bindTexture(target: number, texture: RawGlTexture | null): void;
  activeTexture(texture: number): void;
  texParameteri(target: number, pname: number, param: number): void;
  texImage2D(
    target: number,
    level: number,
    internalFormat: number,
    width: number,
    height: number,
    border: number,
    format: number,
    type: number,
    pixels: ArrayBufferView | null,
  ): void;
  createFramebuffer(): RawGlFramebuffer | null;
  deleteFramebuffer(framebuffer: RawGlFramebuffer | null): void;
  bindFramebuffer(target: number, framebuffer: RawGlFramebuffer | null): void;
  framebufferTexture2D(
    target: number,
    attachment: number,
    textarget: number,
    texture: RawGlTexture | null,
    level: number,
  ): void;
  checkFramebufferStatus(target: number): number;
  createRenderbuffer(): RawGlRenderbuffer | null;
  deleteRenderbuffer(renderbuffer: RawGlRenderbuffer | null): void;
  bindRenderbuffer(target: number, renderbuffer: RawGlRenderbuffer | null): void;
  renderbufferStorage(
    target: number,
    internalFormat: number,
    width: number,
    height: number,
  ): void;
  framebufferRenderbuffer(
    target: number,
    attachment: number,
    renderbuffertarget: number,
    renderbuffer: RawGlRenderbuffer | null,
  ): void;
  clearColor(red: number, green: number, blue: number, alpha: number): void;
  clearDepth(depth: number): void;
  enable(capability: number): void;
  disable(capability: number): void;
  depthFunc(func: number): void;
  clear(mask: number): void;
  blendFunc(sourceFactor: number, destinationFactor: number): void;
  depthMask(flag: boolean): void;
  polygonOffset(factor: number, units: number): void;
  useProgram(program: RawGlProgramHandle | null): void;
  uniformMatrix4fv(
    location: RawGlUniformLocation,
    transpose: boolean,
    value: readonly number[] | Float32Array,
  ): void;
  uniform1i(location: RawGlUniformLocation, value: number): void;
  uniform2f(location: RawGlUniformLocation, x: number, y: number): void;
  enableVertexAttribArray(index: number): void;
  disableVertexAttribArray(index: number): void;
  vertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number,
  ): void;
  uniform4f(
    location: RawGlUniformLocation,
    x: number,
    y: number,
    z: number,
    w: number,
  ): void;
  drawArrays(mode: number, first: number, count: number): void;
};

export type RuntimeColor = readonly [number, number, number, number];

export type RuntimeDrawMode = 'triangles' | 'lines' | 'conditional-lines';

export type RuntimeDrawCall = {
  mode: RuntimeDrawMode;
  /** triangles/lines: xyz…; conditional-lines: interleaved [pos,p2,p3,p4]… */
  positions: Float32Array;
  center: readonly [number, number, number];
  color: RuntimeColor;
  transparent: boolean;
  polygonOffset: readonly [number, number] | null;
};

export type UploadedDrawCall = {
  mode: number;
  kind: 'solid' | 'conditional';
  buffer: RawGlBuffer;
  count: number;
  center: readonly [number, number, number];
  color: RuntimeColor;
  transparent: boolean;
  polygonOffset: readonly [number, number] | null;
};

export type SceneGlProgram = {
  program: RawGlProgramHandle;
  position: number;
  modelViewProjection: RawGlUniformLocation;
  color: RawGlUniformLocation;
};

export type ConditionalGlProgram = {
  program: RawGlProgramHandle;
  position: number;
  p2: number;
  p3: number;
  p4: number;
  modelViewProjection: RawGlUniformLocation;
  color: RawGlUniformLocation;
};

export type FxaaGlProgram = {
  program: RawGlProgramHandle;
  position: number;
  texCoord: number;
  texture: RawGlUniformLocation;
  resolution: RawGlUniformLocation;
};

export type FxaaRenderTarget = {
  width: number;
  height: number;
  framebuffer: RawGlFramebuffer;
  colorTexture: RawGlTexture;
  depthBuffer: RawGlRenderbuffer;
};

export type RawGlProgram = {
  scene: SceneGlProgram;
  conditional: ConditionalGlProgram;
  fxaa: FxaaGlProgram;
  screenQuadBuffer: RawGlBuffer;
  fxaaTarget: FxaaRenderTarget | null;
};

export type UploadedFrame = {
  calls: UploadedDrawCall[];
};
