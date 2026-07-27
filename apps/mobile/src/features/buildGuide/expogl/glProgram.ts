import type {
  ExpoGlRuntimeContext,
  RawGlProgram,
  RawGlShader,
} from './glTypes';

const VERTEX_SHADER_SOURCE = `
attribute vec3 a_position;
uniform mat4 u_modelViewProjection;

void main() {
  gl_Position = u_modelViewProjection * vec4(a_position, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

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

export function createProgram(gl: ExpoGlRuntimeContext): RawGlProgram {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    VERTEX_SHADER_SOURCE,
  );
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    FRAGMENT_SHADER_SOURCE,
  );
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

  const position = gl.getAttribLocation(program, 'a_position');
  const modelViewProjection = gl.getUniformLocation(
    program,
    'u_modelViewProjection',
  );
  const color = gl.getUniformLocation(program, 'u_color');

  if (position < 0 || !modelViewProjection || !color) {
    gl.deleteProgram(program);
    throw new Error('Expo GL program is missing required bindings.');
  }

  return {
    program,
    position,
    modelViewProjection,
    color,
  };
}