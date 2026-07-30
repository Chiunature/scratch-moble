import * as THREE from 'three';

import { drawUploadedCalls } from '../../expogl/drawUploadedCalls';
import type {
  CanvasLayoutSize,
  ExpoGlRuntimeContext,
  RawGlProgram,
  RenderSize,
  UploadedFrame,
} from '../../expogl/glTypes';
import type { PliThumbnailViewport } from './types';

export type PliUploadedThumbnail = {
  key: string;
  viewport: PliThumbnailViewport;
  frame: UploadedFrame;
  camera: THREE.OrthographicCamera;
};

const _identityMatrix = new THREE.Matrix4();
const _modelViewMatrix = new THREE.Matrix4();
const _mvpMatrix = new THREE.Matrix4();

type PhysicalViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function resetGlState(gl: ExpoGlRuntimeContext, size: RenderSize): void {
  gl.viewport(0, 0, size.width, size.height);
  gl.clearColor(1, 1, 1, 0);
  gl.clearDepth(1);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.depthMask(true);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT + gl.DEPTH_BUFFER_BIT);
}

function updateCameraMatrix(camera: THREE.Camera): void {
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
}

function resolvePhysicalViewport(
  viewport: PliThumbnailViewport,
  layoutSize: CanvasLayoutSize,
  renderSize: RenderSize,
): PhysicalViewport | null {
  if (
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    layoutSize.width <= 0 ||
    layoutSize.height <= 0
  ) {
    return null;
  }

  const scaleX = renderSize.width / layoutSize.width;
  const scaleY = renderSize.height / layoutSize.height;
  const x = Math.max(0, Math.round(viewport.x * scaleX));
  const y = Math.max(
    0,
    Math.round(renderSize.height - (viewport.y + viewport.height) * scaleY),
  );
  const width = Math.min(
    renderSize.width - x,
    Math.max(1, Math.round(viewport.width * scaleX)),
  );
  const height = Math.min(
    renderSize.height - y,
    Math.max(1, Math.round(viewport.height * scaleY)),
  );

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}

function drawSceneCalls(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram,
  frame: UploadedFrame,
  camera: THREE.OrthographicCamera,
): void {
  updateCameraMatrix(camera);
  _modelViewMatrix.multiplyMatrices(
    camera.matrixWorldInverse,
    _identityMatrix,
  );
  _mvpMatrix.multiplyMatrices(camera.projectionMatrix, _modelViewMatrix);
  drawUploadedCalls(gl, program, frame.calls, _mvpMatrix.elements);
}

export function drawPliThumbnailFrame(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram,
  thumbnails: ReadonlyArray<PliUploadedThumbnail>,
  layoutSize: CanvasLayoutSize,
  renderSize: RenderSize,
): void {
  resetGlState(gl, renderSize);

  for (const thumbnail of thumbnails) {
    const viewport = resolvePhysicalViewport(
      thumbnail.viewport,
      layoutSize,
      renderSize,
    );
    if (!viewport) {
      continue;
    }

    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
    drawSceneCalls(gl, program, thumbnail.frame, thumbnail.camera);
  }

  gl.flushEXP();
  gl.endFrameEXP();
}
