import type {
  ConditionalGlProgram,
  ExpoGlRuntimeContext,
  RawGlProgram,
  SceneGlProgram,
  UploadedDrawCall,
} from './glTypes';
import {
  CONDITIONAL_P2_OFFSET_BYTES,
  CONDITIONAL_P3_OFFSET_BYTES,
  CONDITIONAL_P4_OFFSET_BYTES,
  CONDITIONAL_STRIDE_BYTES,
} from './glConditionalLayout';

export function applyUploadedDrawState(
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

function bindSolidCall(
  gl: ExpoGlRuntimeContext,
  sceneProgram: SceneGlProgram,
  call: UploadedDrawCall,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, call.buffer);
  gl.vertexAttribPointer(sceneProgram.position, 3, gl.FLOAT, false, 0, 0);
  gl.uniform4f(
    sceneProgram.color,
    call.color[0],
    call.color[1],
    call.color[2],
    call.color[3],
  );
}

function bindConditionalCall(
  gl: ExpoGlRuntimeContext,
  conditionalProgram: ConditionalGlProgram,
  call: UploadedDrawCall,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, call.buffer);
  gl.vertexAttribPointer(
    conditionalProgram.position,
    3,
    gl.FLOAT,
    false,
    CONDITIONAL_STRIDE_BYTES,
    0,
  );
  gl.vertexAttribPointer(
    conditionalProgram.p2,
    3,
    gl.FLOAT,
    false,
    CONDITIONAL_STRIDE_BYTES,
    CONDITIONAL_P2_OFFSET_BYTES,
  );
  gl.vertexAttribPointer(
    conditionalProgram.p3,
    3,
    gl.FLOAT,
    false,
    CONDITIONAL_STRIDE_BYTES,
    CONDITIONAL_P3_OFFSET_BYTES,
  );
  gl.vertexAttribPointer(
    conditionalProgram.p4,
    3,
    gl.FLOAT,
    false,
    CONDITIONAL_STRIDE_BYTES,
    CONDITIONAL_P4_OFFSET_BYTES,
  );
  gl.uniform4f(
    conditionalProgram.color,
    call.color[0],
    call.color[1],
    call.color[2],
    call.color[3],
  );
}

function disableKindAttributes(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram,
  kind: UploadedDrawCall['kind'],
): void {
  if (kind === 'solid') {
    gl.disableVertexAttribArray(program.scene.position);
    return;
  }

  gl.disableVertexAttribArray(program.conditional.position);
  gl.disableVertexAttribArray(program.conditional.p2);
  gl.disableVertexAttribArray(program.conditional.p3);
  gl.disableVertexAttribArray(program.conditional.p4);
}

function activateKind(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram,
  kind: UploadedDrawCall['kind'],
  mvpElements: Float32Array | readonly number[],
): void {
  if (kind === 'conditional') {
    gl.useProgram(program.conditional.program);
    gl.uniformMatrix4fv(
      program.conditional.modelViewProjection,
      false,
      mvpElements,
    );
    gl.enableVertexAttribArray(program.conditional.position);
    gl.enableVertexAttribArray(program.conditional.p2);
    gl.enableVertexAttribArray(program.conditional.p3);
    gl.enableVertexAttribArray(program.conditional.p4);
    return;
  }

  gl.useProgram(program.scene.program);
  gl.uniformMatrix4fv(program.scene.modelViewProjection, false, mvpElements);
  gl.enableVertexAttribArray(program.scene.position);
}

/** Draw uploaded calls with solid / conditional program switching. */
export function drawUploadedCalls(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram,
  calls: ReadonlyArray<UploadedDrawCall>,
  mvpElements: Float32Array | readonly number[],
): void {
  let activeKind: UploadedDrawCall['kind'] | null = null;

  for (const call of calls) {
    applyUploadedDrawState(gl, call);

    if (call.kind !== activeKind) {
      if (activeKind) {
        disableKindAttributes(gl, program, activeKind);
      }
      activateKind(gl, program, call.kind, mvpElements);
      activeKind = call.kind;
    }

    if (call.kind === 'conditional') {
      bindConditionalCall(gl, program.conditional, call);
    } else {
      bindSolidCall(gl, program.scene, call);
    }
    gl.drawArrays(call.mode, 0, call.count);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  if (activeKind) {
    disableKindAttributes(gl, program, activeKind);
  }
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  gl.disable(gl.POLYGON_OFFSET_FILL);
}
