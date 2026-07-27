import type {
  ExpoGlRuntimeContext,
  FxaaRenderTarget,
  RawGlProgram,
  RawGlProgramHandle,
  RawGlShader,
} from './glTypes';

const SCENE_VERTEX_SHADER_SOURCE = `
attribute vec3 a_position;
uniform mat4 u_modelViewProjection;

void main() {
  gl_Position = u_modelViewProjection * vec4(a_position, 1.0);
}
`;

const SCENE_FRAGMENT_SHADER_SOURCE = `
precision mediump float;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

const FXAA_VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FXAA_FRAGMENT_SHADER_SOURCE = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

const float FXAA_REDUCE_MIN = 0.0078125;
const float FXAA_REDUCE_MUL = 0.125;
const float FXAA_SPAN_MAX = 8.0;

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 inverseResolution = 1.0 / u_resolution;
  vec3 rgbNW = texture2D(u_texture, v_texCoord + vec2(-1.0, -1.0) * inverseResolution).rgb;
  vec3 rgbNE = texture2D(u_texture, v_texCoord + vec2(1.0, -1.0) * inverseResolution).rgb;
  vec3 rgbSW = texture2D(u_texture, v_texCoord + vec2(-1.0, 1.0) * inverseResolution).rgb;
  vec3 rgbSE = texture2D(u_texture, v_texCoord + vec2(1.0, 1.0) * inverseResolution).rgb;
  vec3 rgbM = texture2D(u_texture, v_texCoord).rgb;

  float lumaNW = luma(rgbNW);
  float lumaNE = luma(rgbNE);
  float lumaSW = luma(rgbSW);
  float lumaSE = luma(rgbSE);
  float lumaM = luma(rgbM);
  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  vec2 dir;
  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
  dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

  float dirReduce = max(
    (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL),
    FXAA_REDUCE_MIN
  );
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = min(
    vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
    max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)
  ) * inverseResolution;

  vec3 rgbA = 0.5 * (
    texture2D(u_texture, v_texCoord + dir * (1.0 / 3.0 - 0.5)).rgb +
    texture2D(u_texture, v_texCoord + dir * (2.0 / 3.0 - 0.5)).rgb
  );
  vec3 rgbB = rgbA * 0.5 + 0.25 * (
    texture2D(u_texture, v_texCoord + dir * -0.5).rgb +
    texture2D(u_texture, v_texCoord + dir * 0.5).rgb
  );
  float lumaB = luma(rgbB);

  gl_FragColor = vec4((lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB, 1.0);
}
`;

const SCREEN_QUAD_VERTICES = new Float32Array([
  -1, -1, 0, 0,
  1, -1, 1, 0,
  -1, 1, 0, 1,
  -1, 1, 0, 1,
  1, -1, 1, 0,
  1, 1, 1, 1,
]);

export function compileShader(
  gl: ExpoGlRuntimeContext,
  type: number,
  source: string,
): RawGlShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create Expo GL shader.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const detail = gl.getShaderInfoLog(shader) || 'Unknown shader error';
    gl.deleteShader(shader);
    throw new Error(detail);
  }

  return shader;
}

function createLinkedProgram(
  gl: ExpoGlRuntimeContext,
  vertexSource: string,
  fragmentSource: string,
): RawGlProgramHandle {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error('Failed to create Expo GL program.');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const detail =
      gl.getProgramInfoLog(program) || 'Unknown program link error';
    gl.deleteProgram(program);
    throw new Error(detail);
  }

  return program;
}

function getRequiredUniformLocation(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgramHandle,
  name: string,
) {
  const location = gl.getUniformLocation(program, name);
  if (!location) {
    throw new Error(`Expo GL program is missing uniform "${name}".`);
  }
  return location;
}

function createScreenQuadBuffer(gl: ExpoGlRuntimeContext) {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error('Failed to create Expo GL screen quad buffer.');
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, SCREEN_QUAD_VERTICES, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
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

export function createProgram(gl: ExpoGlRuntimeContext): RawGlProgram {
  const sceneProgram = createLinkedProgram(
    gl,
    SCENE_VERTEX_SHADER_SOURCE,
    SCENE_FRAGMENT_SHADER_SOURCE,
  );

  try {
    const fxaaProgram = createLinkedProgram(
      gl,
      FXAA_VERTEX_SHADER_SOURCE,
      FXAA_FRAGMENT_SHADER_SOURCE,
    );
    const screenQuadBuffer = createScreenQuadBuffer(gl);

    const scenePosition = gl.getAttribLocation(sceneProgram, 'a_position');
    const fxaaPosition = gl.getAttribLocation(fxaaProgram, 'a_position');
    const fxaaTexCoord = gl.getAttribLocation(fxaaProgram, 'a_texCoord');

    if (scenePosition < 0 || fxaaPosition < 0 || fxaaTexCoord < 0) {
      gl.deleteProgram(fxaaProgram);
      gl.deleteBuffer(screenQuadBuffer);
      throw new Error('Expo GL program is missing required attributes.');
    }

    return {
      scene: {
        program: sceneProgram,
        position: scenePosition,
        modelViewProjection: getRequiredUniformLocation(
          gl,
          sceneProgram,
          'u_modelViewProjection',
        ),
        color: getRequiredUniformLocation(gl, sceneProgram, 'u_color'),
      },
      fxaa: {
        program: fxaaProgram,
        position: fxaaPosition,
        texCoord: fxaaTexCoord,
        texture: getRequiredUniformLocation(gl, fxaaProgram, 'u_texture'),
        resolution: getRequiredUniformLocation(gl, fxaaProgram, 'u_resolution'),
      },
      screenQuadBuffer,
      fxaaTarget: null,
    };
  } catch (cause: unknown) {
    gl.deleteProgram(sceneProgram);
    throw cause;
  }
}

export function disposeProgram(
  gl: ExpoGlRuntimeContext,
  program: RawGlProgram | null,
): void {
  if (!program) {
    return;
  }

  disposeFxaaTarget(gl, program.fxaaTarget);
  program.fxaaTarget = null;
  gl.deleteBuffer(program.screenQuadBuffer);
  gl.deleteProgram(program.scene.program);
  gl.deleteProgram(program.fxaa.program);
}