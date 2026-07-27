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
  clearColor(red: number, green: number, blue: number, alpha: number): void;
  clearDepth(depth: number): void;
  enable(capability: number): void;
  disable(capability: number): void;
  depthFunc(func: number): void;
  clear(mask: number): void;
  blendFunc(sourceFactor: number, destinationFactor: number): void;
  depthMask(flag: boolean): void;
  useProgram(program: RawGlProgramHandle | null): void;
  uniformMatrix4fv(
    location: RawGlUniformLocation,
    transpose: boolean,
    value: readonly number[] | Float32Array,
  ): void;
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

export type RuntimeDrawMode = 'triangles' | 'lines';

export type RuntimeDrawCall = {
  mode: RuntimeDrawMode;
  positions: Float32Array;
  color: RuntimeColor;
  transparent: boolean;
};

export type UploadedDrawCall = {
  mode: number;
  buffer: RawGlBuffer;
  count: number;
  color: RuntimeColor;
  transparent: boolean;
};

export type RawGlProgram = {
  program: RawGlProgramHandle;
  position: number;
  modelViewProjection: RawGlUniformLocation;
  color: RawGlUniformLocation;
};

export type UploadedFrame = {
  calls: UploadedDrawCall[];
};