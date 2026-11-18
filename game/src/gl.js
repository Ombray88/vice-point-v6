/**
 * WebGL2 Rendering Context & Matrix Helpers for Vice Point 6D
 * Provides WebGL2 context initialization, shader compilation, primitive rendering (box, quad),
 * and pure 4x4 column-major matrix operations.
 */

// --- Matrix Helpers (Pure Functions returning new Float32Array or arrays) ---

/**
 * Creates a 4x4 identity matrix.
 * @returns {Float32Array}
 */
export function matIdentity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

/**
 * Creates a 4x4 translation matrix.
 * @param {number} x 
 * @param {number} y 
 * @param {number} z 
 * @returns {Float32Array}
 */
export function matTranslate(x, y, z) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1
  ]);
}

/**
 * Creates a 4x4 scale matrix.
 * @param {number} x 
 * @param {number} y 
 * @param {number} z 
 * @returns {Float32Array}
 */
export function matScale(x, y, z) {
  return new Float32Array([
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1
  ]);
}

/**
 * Creates a 4x4 Y-axis rotation matrix.
 * @param {number} angle Angle in radians
 * @returns {Float32Array}
 */
export function matRotateY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1,  0, 0,
    s, 0,  c, 0,
    0, 0,  0, 1
  ]);
}

/**
 * Multiplies two 4x4 matrices: a * b (applies b first, then a).
 * @param {Array<number>|Float32Array} a 
 * @param {Array<number>|Float32Array} b 
 * @returns {Float32Array}
 */
export function matMultiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + r] * b[c * 4 + k];
      }
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

/**
 * Creates a perspective projection matrix.
 * @param {number} fov Field of view in radians
 * @param {number} aspect Viewport aspect ratio (width / height)
 * @param {number} near Near clipping plane
 * @param {number} far Far clipping plane
 * @returns {Float32Array}
 */
export function matPerspective(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);

  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;

  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;

  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) * nf;
  out[11] = -1;

  out[12] = 0;
  out[13] = 0;
  out[14] = (2 * far * near) * nf;
  out[15] = 0;

  return out;
}

/**
 * Creates a view matrix (LookAt).
 * @param {Array<number>} eye Position of camera [x, y, z]
 * @param {Array<number>} target Target point [x, y, z]
 * @param {Array<number>} up Up vector [x, y, z]
 * @returns {Float32Array}
 */
export function matLookAt(eye, target, up) {
  let ex = eye[0], ey = eye[1], ez = eye[2];
  let tx = target[0], ty = target[1], tz = target[2];
  let ux = up[0], uy = up[1], uz = up[2];

  let z0 = ex - tx;
  let z1 = ey - ty;
  let z2 = ez - tz;
  let len = Math.hypot(z0, z1, z2);
  if (len > 0) {
    z0 /= len;
    z1 /= len;
    z2 /= len;
  } else {
    z0 = 0; z1 = 0; z2 = 1;
  }

  let x0 = uy * z2 - uz * z1;
  let x1 = uz * z0 - ux * z2;
  let x2 = ux * z1 - uy * z0;
  len = Math.hypot(x0, x1, x2);
  if (len > 0) {
    x0 /= len;
    x1 /= len;
    x2 /= len;
  }

  let y0 = z1 * x2 - z2 * x1;
  let y1 = z2 * x0 - z0 * x2;
  let y2 = z0 * x1 - z1 * x0;

  const out = new Float32Array(16);
  out[0] = x0;  out[1] = y0;  out[2] = z0;  out[3] = 0;
  out[4] = x1;  out[5] = y1;  out[6] = z1;  out[7] = 0;
  out[8] = x2;  out[9] = y2;  out[10] = z2; out[11] = 0;
  out[12] = -(x0 * ex + x1 * ey + x2 * ez);
  out[13] = -(y0 * ex + y1 * ey + y2 * ez);
  out[14] = -(z0 * ex + z1 * ey + z2 * ez);
  out[15] = 1;

  return out;
}

/**
 * Convenience matrix combining translation, Y-rotation and scale.
 * @param {number} x 
 * @param {number} y 
 * @param {number} z 
 * @param {number} angle 
 * @param {number} sx 
 * @param {number} sy 
 * @param {number} sz 
 * @returns {Float32Array}
 */
export function matFromPosAngle(x, y, z, angle, sx, sy, sz) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  const out = new Float32Array(16);
  // T * R * S matrix combination
  out[0] = sx * c;
  out[1] = 0;
  out[2] = sx * -s;
  out[3] = 0;

  out[4] = 0;
  out[5] = sy;
  out[6] = 0;
  out[7] = 0;

  out[8] = sz * s;
  out[9] = 0;
  out[10] = sz * c;
  out[11] = 0;

  out[12] = x;
  out[13] = y;
  out[14] = z;
  out[15] = 1;

  return out;
}


// --- WebGL2 Shader Sources ---

const VERTEX_SHADER_SRC = `#version 300 es
in vec3 aPosition;
uniform mat4 uViewProj;
uniform mat4 uModel;

void main() {
  gl_Position = uViewProj * uModel * vec4(aPosition, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 fragColor;

void main() {
  fragColor = uColor;
}
`;


// --- Helper: Compile Shader & Link Program ---

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Failed to compile shader: ' + info);
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Failed to link program: ' + info);
  }
  return program;
}


// --- Geometry Data for Box and Quad ---

// Unit box centered at origin (-0.5 to 0.5) with 24 vertices (or indexed 36 indices)
const BOX_VERTICES = new Float32Array([
  // Front face (-Z)
  -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5,  0.5, -0.5,  -0.5,  0.5, -0.5,
  // Back face (+Z)
  -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
  // Left face (-X)
  -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,  -0.5, -0.5,  0.5,
  // Right face (+X)
   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
  // Bottom face (-Y)
  -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5, -0.5, -0.5,
  // Top face (+Y)
  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
]);

const BOX_INDICES = new Uint16Array([
   0,  1,  2,   0,  2,  3,    // front
   4,  6,  5,   4,  7,  6,    // back
   8,  9, 10,   8, 10, 11,    // left
  12, 13, 14,  12, 14, 15,    // right
  16, 17, 18,  16, 18, 19,    // bottom
  20, 22, 21,  20, 23, 22,    // top
]);

// Unit quad lying in XZ plane (-0.5 to 0.5)
const QUAD_VERTICES = new Float32Array([
  -0.5, 0.0, -0.5,
   0.5, 0.0, -0.5,
   0.5, 0.0,  0.5,
  -0.5, 0.0,  0.5,
]);

const QUAD_INDICES = new Uint16Array([
  0, 1, 2,
  0, 2, 3
]);


/**
 * Initializes a WebGL2 rendering context on the given canvas and returns rendering methods.
 * @param {HTMLCanvasElement} canvas 
 * @returns {Object}
 */
export function createGL(canvas) {
  if (!canvas) {
    throw new Error('Canvas element is required for createGL');
  }

  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  if (!gl) {
    throw new Error('WebGL2 is not available or supported in this browser/environment.');
  }

  const program = createProgram(gl, VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC);
  
  // Uniform and Attribute locations
  const uViewProjLoc = gl.getUniformLocation(program, 'uViewProj');
  const uModelLoc = gl.getUniformLocation(program, 'uModel');
  const uColorLoc = gl.getUniformLocation(program, 'uColor');
  const aPositionLoc = gl.getAttribLocation(program, 'aPosition');

  // Setup Box Buffers
  const boxVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, boxVBO);
  gl.bufferData(gl.ARRAY_BUFFER, BOX_VERTICES, gl.STATIC_DRAW);

  const boxIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boxIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, BOX_INDICES, gl.STATIC_DRAW);

  // Setup Quad Buffers
  const quadVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);

  const quadIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, QUAD_INDICES, gl.STATIC_DRAW);

  // State cache for active buffers
  let activeVBO = null;
  let activeIBO = null;

  function bindBoxBuffers() {
    if (activeVBO !== boxVBO || activeIBO !== boxIBO) {
      gl.bindBuffer(gl.ARRAY_BUFFER, boxVBO);
      gl.enableVertexAttribArray(aPositionLoc);
      gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boxIBO);
      activeVBO = boxVBO;
      activeIBO = boxIBO;
    }
  }

  function bindQuadBuffers() {
    if (activeVBO !== quadVBO || activeIBO !== quadIBO) {
      gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
      gl.enableVertexAttribArray(aPositionLoc);
      gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIBO);
      activeVBO = quadVBO;
      activeIBO = quadIBO;
    }
  }

  // Active combined view-projection matrix stored for draws if needed
  let currentViewProj = matIdentity();

  return {
    gl,

    beginFrame(clearColor) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      const r = clearColor ? clearColor[0] : 0.1;
      const g = clearColor ? clearColor[1] : 0.1;
      const b = clearColor ? clearColor[2] : 0.15;
      const a = clearColor ? clearColor[3] : 1.0;

      gl.clearColor(r, g, b, a);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(program);
    },

    setCamera(viewMatrix, projMatrix) {
      currentViewProj = matMultiply(projMatrix, viewMatrix);
      gl.uniformMatrix4fv(uViewProjLoc, false, currentViewProj);
    },

    box(matrix, r, g, b, a) {
      bindBoxBuffers();
      gl.uniformMatrix4fv(uModelLoc, false, matrix);
      gl.uniform4f(uColorLoc, r, g, b, a);
      gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    },

    quad(matrix, r, g, b, a) {
      bindQuadBuffers();
      gl.uniformMatrix4fv(uModelLoc, false, matrix);
      gl.uniform4f(uColorLoc, r, g, b, a);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
  };
}
