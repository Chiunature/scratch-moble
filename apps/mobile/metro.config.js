const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const workspaceRoot = path.resolve(__dirname, '../..');
const packagesRoot = path.resolve(workspaceRoot, 'packages');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');
const threePackagePath = path.resolve(workspaceNodeModules, 'three');

const r3fPath = path.dirname(
  require.resolve('@react-three/fiber/package.json', {
    paths: [__dirname, workspaceRoot],
  }),
);

const defaultConfig = getDefaultConfig(__dirname);
const { transformer, resolver } = defaultConfig;

const config = {
  projectRoot: __dirname,
  watchFolders: [packagesRoot, workspaceNodeModules],
  server: {
    unstable_serverRoot: __dirname,
  },
  transformer: {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    ...resolver,
    extraNodeModules: {
      three: threePackagePath,
      i18next: path.resolve(workspaceNodeModules, 'i18next'),
      'react-i18next': path.resolve(workspaceNodeModules, 'react-i18next'),
    },
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      workspaceNodeModules,
    ],
    unstable_enableSymlinks: true,
    assetExts: [
      ...resolver.assetExts.filter(ext => ext !== 'svg'),
      'glb',
      'gltf',
      'bin',
      'hdr',
    ],
    sourceExts: [...resolver.sourceExts, 'svg'],
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName.startsWith('three/addons/')) {
        return {
          filePath: path.resolve(
            threePackagePath,
            'examples/jsm/' +
              moduleName.replace('three/addons/', '') +
              '.js',
          ),
          type: 'sourceFile',
        };
      }

      if (moduleName === 'three' || moduleName === 'three/webgpu') {
        return {
          filePath: path.resolve(threePackagePath, 'build/three.webgpu.js'),
          type: 'sourceFile',
        };
      }

      if (moduleName === 'three/tsl') {
        return {
          filePath: path.resolve(threePackagePath, 'build/three.tsl.js'),
          type: 'sourceFile',
        };
      }

      if (moduleName === '@react-three/fiber') {
        return {
          filePath: path.resolve(r3fPath, 'dist/react-three-fiber.esm.js'),
          type: 'sourceFile',
        };
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
