import { PixelRatio } from 'react-native';
import * as THREE from 'three';

import type {
  CanvasLayoutSize,
  ExpoGlRuntimeContext,
  FxaaRenderTarget,
  RawGlProgram,
  RenderSize,
  RuntimeDrawCall,
  SceneGlProgram,
  UploadedDrawCall,
  UploadedFrame,
} from './glTypes';

const SCENE_BACKGROUND = 0xffffff;
const MAX_EXPO_GL_DPR = 3;
const SCREEN_QUAD_VERTEX_COUNT = 6;
const SCREEN_QUAD_STRIDE_BYTES = 4 * 4;
const SCREEN_QUAD_TEXCOORD_OFFSET_BYTES = 2 * 4;

const _color = new THREE.Color();
const _mvpMatrix = new THREE.Matrix4();
const _modelViewMatrix = new THREE.Matrix4();
const _sortVector = new THREE.Vector3();
const _opaqueCalls: UploadedDrawCall[] = [];
const _transparentCalls: UploadedDrawCall[] = [];
const _lineCalls: UploadedDrawCall[] = [];
const _orderedCalls: UploadedDrawCall[] = [];

function hexToClearColor(hex: number): readonly [number, number, number] {
  _color.setHex(hex).convertLinearToSRGB();
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
      center: call.center,
      color: call.color,
      transparent: call.transparent,
      polygonOffset: call.polygonOffset,
    };
  });

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return {
    calls,
  };
}

function disposeFxaaTarget(
  gl: ExpoGlRuntimeContext,
  target: FxaaRenderTarget | null,
): void {
  if (!target) {
    return;
  }

  gl.deleteFramebuffer(target.framebuffer);
  gl.deleteTexture(target.colorTexture);
  gl.deleteRenderbuffer(target.depthBuffer);
}

function createFxaaTarget(
  gl: ExpoGlRuntimeContext,
  size: RenderSize,
): FxaaRenderTarget | null {
  const colorTexture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  const depthBuffer = gl.createRenderbuffer();

  if (!colorTexture || !framebuffer || !depthBuffer) {
    gl.deleteTexture(colorTexture);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteRenderbuffer(depthBuffer);
    return null;
  }

  gl.bindTexture(gl.TEXTURE_2D, colorTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    size.width,
    size.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );

  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(
    gl.RENDERBUFFER,
    gl.DEPTH_COMPONENT16,
    size.width,
    size.height,
  );

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    colorTexture,
    0,
  );
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    depthBuffer,
  );

  const complete =
    gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  const target = {
    width: size.width,
    height: size.height,
    framebuffer,
    colorTexture,
    depthBuffer,
  };

  if (!complete) {
    disposeFxaaTarget(gl, target);
    return null;
  }

  return target;
}

function ensureFxaaTarget(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram,
  size: RenderSize,
): FxaaRenderTarget | null {
  const target = program.fxaaTarget;
  if (target && target.width === size.width && target.height === size.height) {
    return target;
  }

  disposeFxaaTarget(gl, target);
  program.fxaaTarget = createFxaaTarget(gl, size);
  return program.fxaaTarget;
}

function resetGlState(gl: ExpoGlRuntimeContext, size: RenderSize): void {
  const [r, g, b] = hexToClearColor(SCENE_BACKGROUND);
  gl.viewport(0, 0, size.width, size.height);
  gl.clearColor(r, g, b, 1);
  gl.clearDepth(1);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.depthMask(true);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT + gl.DEPTH_BUFFER_BIT);
}

function applyDrawState(
  gl: ExpoGlRuntimeContext,
  call: UploadedDrawCall,
): void {
  if (call.polygonOffset && call.mode !== gl.LINES) {
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(call.polygonOffset[0], call.polygonOffset[1]);
  } else {
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

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

function getCallViewDepth(
  call: UploadedDrawCall,
  modelViewMatrix: THREE.Matrix4,
): number {
  _sortVector.set(call.center[0], call.center[1], call.center[2]);
  _sortVector.applyMatrix4(modelViewMatrix);
  return _sortVector.z;
}

function resolveDrawOrder(
  gl: ExpoGlRuntimeContext,
  calls: UploadedDrawCall[],
  modelViewMatrix: THREE.Matrix4,
): UploadedDrawCall[] {
  _opaqueCalls.length = 0;
  _transparentCalls.length = 0;
  _lineCalls.length = 0;
  _orderedCalls.length = 0;

  for (const call of calls) {
    if (call.mode === gl.LINES) {
      _lineCalls.push(call);
    } else if (call.transparent) {
      _transparentCalls.push(call);
    } else {
      _opaqueCalls.push(call);
    }
  }

  _transparentCalls.sort(
    (a, b) => getCallViewDepth(a, modelViewMatrix) - getCallViewDepth(b, modelViewMatrix),
  );

  _orderedCalls.push(..._opaqueCalls, ..._transparentCalls, ..._lineCalls);
  return _orderedCalls;
}

function drawSceneCalls(
  gl: ExpoGlRuntimeContext,
  sceneProgram: SceneGlProgram,
  frame: UploadedFrame,
  camera: THREE.Camera,
  modelMatrix: THREE.Matrix4,
): void {
  updateCameraMatrix(camera);
  _modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, modelMatrix);
  _mvpMatrix.multiplyMatrices(camera.projectionMatrix, _modelViewMatrix);

  gl.useProgram(sceneProgram.program);
  gl.uniformMatrix4fv(
    sceneProgram.modelViewProjection,
    false,
    _mvpMatrix.elements,
  );
  gl.enableVertexAttribArray(sceneProgram.position);

  for (const call of resolveDrawOrder(gl, frame.calls, _modelViewMatrix)) {
    applyDrawState(gl, call);
    gl.bindBuffer(gl.ARRAY_BUFFER, call.buffer);
    gl.vertexAttribPointer(sceneProgram.position, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4f(
      sceneProgram.color,
      call.color[0],
      call.color[1],
      call.color[2],
      call.color[3],
    );
    gl.drawArrays(call.mode, 0, call.count);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(sceneProgram.position);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  gl.disable(gl.POLYGON_OFFSET_FILL);
}

function drawFxaaPass(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram,
  target: FxaaRenderTarget,
  size: RenderSize,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, size.width, size.height);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.depthMask(false);

  gl.useProgram(program.fxaa.program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, target.colorTexture);
  gl.uniform1i(program.fxaa.texture, 0);
  gl.uniform2f(program.fxaa.resolution, size.width, size.height);

  gl.bindBuffer(gl.ARRAY_BUFFER, program.screenQuadBuffer);
  gl.enableVertexAttribArray(program.fxaa.position);
  gl.enableVertexAttribArray(program.fxaa.texCoord);
  gl.vertexAttribPointer(
    program.fxaa.position,
    2,
    gl.FLOAT,
    false,
    SCREEN_QUAD_STRIDE_BYTES,
    0,
  );
  gl.vertexAttribPointer(
    program.fxaa.texCoord,
    2,
    gl.FLOAT,
    false,
    SCREEN_QUAD_STRIDE_BYTES,
    SCREEN_QUAD_TEXCOORD_OFFSET_BYTES,
  );
  gl.drawArrays(gl.TRIANGLES, 0, SCREEN_QUAD_VERTEX_COUNT);

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(program.fxaa.position);
  gl.disableVertexAttribArray(program.fxaa.texCoord);
  gl.depthMask(true);
}

export function drawUploadedFrame(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram,
  frame: UploadedFrame | null,
  camera: THREE.Camera,
  size: RenderSize,
  modelMatrix: THREE.Matrix4,
): void {
  if (!frame) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    resetGlState(gl, size);
    gl.flushEXP();
    gl.endFrameEXP();
    return;
  }

  const fxaaTarget = ensureFxaaTarget(gl, program, size);
  if (fxaaTarget) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fxaaTarget.framebuffer);
    resetGlState(gl, size);
    drawSceneCalls(gl, program.scene, frame, camera, modelMatrix);
    drawFxaaPass(gl, program, fxaaTarget, size);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    resetGlState(gl, size);
    drawSceneCalls(gl, program.scene, frame, camera, modelMatrix);
  }

  gl.flushEXP();
  gl.endFrameEXP();
}