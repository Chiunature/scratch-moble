const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const workspaceRoot = path.resolve(__dirname, '../..');
const packagesRoot = path.resolve(workspaceRoot, 'packages');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');
const threePackagePath = path.resolve(workspaceNodeModules, 'three');

const workspacePackages = {
  '@scratch-mobile/build-guide': path.resolve(packagesRoot, 'build-guide/src'),
  '@scratch-mobile/core': path.resolve(packagesRoot, 'core/src'),
  '@scratch-mobile/i18n': path.resolve(packagesRoot, 'i18n/src'),
  '@scratch-mobile/ldr-engine': path.resolve(packagesRoot, 'ldr-engine/src'),
  '@scratch-mobile/protocol': path.resolve(packagesRoot, 'protocol/src'),
  '@scratch-mobile/shared': path.resolve(packagesRoot, 'shared/src'),
};

const config = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = config.resolver;

config.watchFolders = [workspaceRoot];
config.server.unstable_serverRoot = workspaceRoot;
config.transformer.babelTransformerPath = require.resolve(
  'react-native-svg-transformer',
);
config.resolver.assetExts = [
  ...assetExts.filter(ext => ext !== 'svg'),
  'bin',
  'hdr',
  'mpd',
  'ldr',
  'glb',
  'html',
];
config.resolver.sourceExts = [...sourceExts, 'svg'];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  workspaceNodeModules,
];
config.resolver.extraNodeModules = {
  ...workspacePackages,
  three: threePackagePath,
  i18next: path.resolve(workspaceNodeModules, 'i18next'),
  'react-i18next': path.resolve(workspaceNodeModules, 'react-i18next'),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('three/addons/')) {
    return {
      filePath: path.resolve(
        threePackagePath,
        'examples/jsm/',
        `${moduleName.replace('three/addons/', '')}.js`,
      ),
      type: 'sourceFile',
    };
  }

  if (workspacePackages[moduleName]) {
    return {
      filePath: path.resolve(workspacePackages[moduleName], 'index.ts'),
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
