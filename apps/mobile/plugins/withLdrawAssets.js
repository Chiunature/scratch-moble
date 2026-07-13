const fs = require('node:fs');
const path = require('node:path');
const {
  createRunOncePlugin,
  IOSConfig,
  withDangerousMod,
  withXcodeProject,
} = require('expo/config-plugins');

const PLUGIN_NAME = 'with-ldraw-assets';
const PLUGIN_VERSION = '1.0.0';
const DEFAULT_SOURCE = './assets/ldraw';
const RESOURCE_NAME = 'ldraw';

function assertLdrawLibrary(sourceRoot) {
  const hasOfficialLayout = ['parts', 'p'].some(folder =>
    fs.existsSync(path.join(sourceRoot, folder)),
  );
  const hasLegacyLayout = ['ldraw_parts', 'ldraw_unofficial'].some(folder =>
    fs.existsSync(path.join(sourceRoot, folder)),
  );

  if (!hasOfficialLayout && !hasLegacyLayout) {
    throw new Error(
      `[${PLUGIN_NAME}] LDraw library not found at ${sourceRoot}. ` +
        'Expected parts/p or ldraw_parts/ldraw_unofficial directories.',
    );
  }
}

function replaceDirectory(sourceRoot, targetRoot) {
  fs.rmSync(targetRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetRoot), { recursive: true });
  fs.cpSync(sourceRoot, targetRoot, { recursive: true });
}

function resolveSourceRoot(config, source) {
  const sourceRoot = path.resolve(
    config.modRequest.projectRoot,
    source || DEFAULT_SOURCE,
  );
  assertLdrawLibrary(sourceRoot);
  return sourceRoot;
}

function withAndroidLdrawAssets(config, options) {
  return withDangerousMod(config, [
    'android',
    async modConfig => {
      if (modConfig.modRequest.introspect) {
        return modConfig;
      }

      const sourceRoot = resolveSourceRoot(modConfig, options.source);
      const targetRoot = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app/src/main/assets',
        RESOURCE_NAME,
      );
      replaceDirectory(sourceRoot, targetRoot);
      return modConfig;
    },
  ]);
}

function getIosProjectName(config) {
  return IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
}

function withIosLdrawFiles(config, options) {
  return withDangerousMod(config, [
    'ios',
    async modConfig => {
      if (modConfig.modRequest.introspect) {
        return modConfig;
      }

      const sourceRoot = resolveSourceRoot(modConfig, options.source);
      const projectName = getIosProjectName(modConfig);
      const targetRoot = path.join(
        modConfig.modRequest.platformProjectRoot,
        projectName,
        RESOURCE_NAME,
      );
      replaceDirectory(sourceRoot, targetRoot);
      return modConfig;
    },
  ]);
}

function unquote(value) {
  return String(value || '').replace(/^"(.*)"$/, '$1');
}

function hasIosFolderReference(project, resourcePath) {
  return Object.entries(project.pbxFileReferenceSection()).some(
    ([key, value]) =>
      !key.endsWith('_comment') &&
      value &&
      unquote(value.path) === resourcePath &&
      unquote(value.lastKnownFileType) === 'folder',
  );
}

function addIosFolderReference(project, projectName, resourcePath, target) {
  const appGroup = project.findPBXGroupKey({ name: projectName });
  if (!appGroup) {
    throw new Error(
      `[${PLUGIN_NAME}] Xcode group ${projectName} was not found.`,
    );
  }

  // node-xcode's addResourceFile assumes a group named "Resources" exists.
  // Older React Native projects keep resources in the app group instead.
  const file = project.addFile(resourcePath, appGroup, {
    lastKnownFileType: 'folder',
  });
  if (!file) {
    return;
  }

  file.uuid = project.generateUuid();
  file.target = target;
  project.addToPbxBuildFileSection(file);
  project.addToPbxResourcesBuildPhase(file);
}

function withIosLdrawFolderReference(config) {
  return withXcodeProject(config, modConfig => {
    const project = modConfig.modResults;
    const projectName = getIosProjectName(modConfig);
    const resourcePath = `${projectName}/${RESOURCE_NAME}`;

    if (!hasIosFolderReference(project, resourcePath)) {
      const target =
        project.getTarget('com.apple.product-type.application')?.uuid ||
        project.getFirstTarget().uuid;

      addIosFolderReference(project, projectName, resourcePath, target);
    }

    return modConfig;
  });
}

function withLdrawAssets(config, options = {}) {
  config = withAndroidLdrawAssets(config, options);
  config = withIosLdrawFiles(config, options);
  return withIosLdrawFolderReference(config);
}

module.exports = createRunOncePlugin(
  withLdrawAssets,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);