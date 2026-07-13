const {
  createRunOncePlugin,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const PLUGIN_NAME = 'with-expo-module-gradle-plugin';
const PLUGIN_VERSION = '1.0.0';
const REACT_NATIVE_CLASSPATH =
  'classpath("com.facebook.react:react-native-gradle-plugin")';
const EXPO_MODULE_CLASSPATH =
  'classpath("expo.modules:expo-module-gradle-plugin")';

function withExpoModuleGradlePlugin(config) {
  return withProjectBuildGradle(config, modConfig => {
    const { contents } = modConfig.modResults;

    if (contents.includes(EXPO_MODULE_CLASSPATH)) {
      return modConfig;
    }

    if (!contents.includes(REACT_NATIVE_CLASSPATH)) {
      throw new Error(
        `[${PLUGIN_NAME}] React Native Gradle classpath anchor was not found.`,
      );
    }

    modConfig.modResults.contents = contents.replace(
      REACT_NATIVE_CLASSPATH,
      `${REACT_NATIVE_CLASSPATH}\n        ${EXPO_MODULE_CLASSPATH}`,
    );

    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withExpoModuleGradlePlugin,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);