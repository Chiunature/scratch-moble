import * as THREE from 'three';

declare global {
  // eslint-disable-next-line no-var
  var THREE: typeof import('three');
  // eslint-disable-next-line no-var
  var LDR: import('./types').LdrGlobalNamespace;
}

const globalScope = globalThis as typeof globalThis & {
  THREE: typeof THREE;
  LDR: import('./types').LdrGlobalNamespace;
};

globalScope.THREE = THREE;
globalScope.LDR = globalScope.LDR ?? ({} as import('./types').LdrGlobalNamespace);

// Vendor scripts expect globals; require() runs after assignments above (not hoisted).
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./vendor/colors.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./vendor/LDRShaders.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./vendor/LDRColorMaterials.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./vendor/LDRGeometries.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./vendor/LDRLoader.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./vendor/LDRGenerator.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./vendor/LDRStuds.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./vendor/LDRStepHandler.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./vendor/LDRPartsBuilder.js');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { applyWebGpuMaterials } = require('./support/applyWebGpuMaterials.js');
applyWebGpuMaterials();

export { THREE };
