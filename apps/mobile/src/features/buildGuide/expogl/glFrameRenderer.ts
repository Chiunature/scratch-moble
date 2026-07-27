import { PixelRatio } from 'react-native';
import * as THREE from 'three';

import type {
  CanvasLayoutSize,
  ExpoGlRuntimeContext,
  RawGlProgram,
  RenderSize,
  RuntimeDrawCall,
  UploadedDrawCall,
  UploadedFrame,
} from './glTypes';

const SCENE_BACKGROUND = 0xffffff;
const MAX_EXPO_GL_DPR = 3;

const _color = new THREE.Color();
const _mvpMatrix = new THREE.Matrix4();

function hexToClearColor(hex: number): readonly [number, number, number] {
  _color.setHex(hex);
  return [_color.r, _color.g, _color.b];
}

export function resolveRenderSize(
  gl: ExpoGlRuntimeContext,
  size: CanvasLayoutSize,
): RenderSize {
  const dpr = Math.min(PixelRatio.get(), MAX_EXPO_GL_DPR);
  const fallbackWidth = Math.round(size.width * dpr);
  const fallbackHeight = Math.round(size.height * dpr);

  return {
    width: Math.max(1, gl.drawingBufferWidth || fallbackWidth),
    height: Math.max(1, gl.drawingBufferHeight || fallbackHeight),
  };
}

export function disposeUploadedFrame(
  gl: ExpoGlRuntimeContext,
  frame: UploadedFrame | null,
): void {
  if (!frame) {
    return;
  }

  for (const call of frame.calls) {
    gl.deleteBuffer(call.buffer);
  }
}

export function uploadRuntimeDrawCalls(
  gl: ExpoGlRuntimeContext,
  drawCalls: RuntimeDrawCall[],
): UploadedFrame {
  const calls = drawCalls.map(call => {
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to create Expo GL buffer.');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, call.positions, gl.STATIC_DRAW);

    return {
      mode: call.mode === 'triangles' ? gl.TRIANGLES : gl.LINES,
      buffer,
      count: call.positions.length / 3,
      color: call.color,
      transparent: call.transparent,
    };
  });

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return {
    calls,
  };
}

function resetGlState(gl: ExpoGlRuntimeContext, size: RenderSize): void {
  const [r, g, b] = hexToClearColor(SCENE_BACKGROUND);
  gl.viewport(0, 0, size.width, size.height);
  gl.clearColor(r, g, b, 1);
  gl.clearDepth(1);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT + gl.DEPTH_BUFFER_BIT);
}

function applyBlendState(
  gl: ExpoGlRuntimeContext,
  call: UploadedDrawCall,
): void {
  if (call.transparent) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    return;
  }

  if (call.mode === gl.LINES) {
    gl.disable(gl.BLEND);
    gl.depthMask(false);
    return;
  }

  gl.disable(gl.BLEND);
  gl.depthMask(true);
}

function updateCameraMatrix(camera: THREE.Camera): void {
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
}

export function drawUploadedFrame(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram,
  frame: UploadedFrame | null,
  camera: THREE.Camera,
  size: RenderSize,
  modelMatrix: THREE.Matrix4,
): void {
  resetGlState(gl, size);

  if (!frame) {
    gl.flushEXP();
    gl.endFrameEXP();
    return;
  }

  updateCameraMatrix(camera);
  _mvpMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _mvpMatrix.multiply(modelMatrix);

  gl.useProgram(program.program);
  gl.uniformMatrix4fv(program.modelViewProjection, false, _mvpMatrix.elements);
  gl.enableVertexAttribArray(program.position);

  for (const call of frame.calls) {
    applyBlendState(gl, call);
    gl.bindBuffer(gl.ARRAY_BUFFER, call.buffer);
    gl.vertexAttribPointer(program.position, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4f(
      program.color,
      call.color[0],
      call.color[1],
      call.color[2],
      call.color[3],
    );
    gl.drawArrays(call.mode, 0, call.count);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(program.position);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  gl.flushEXP();
  gl.endFrameEXP();
}