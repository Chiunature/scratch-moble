module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'apps/mobile/android/',
    'apps/mobile/ios/',
    'apps/mobile/src/features/editor/generated/',
    'coverage/',
    'node_modules/',
    'packages/scratch-editor-web/dist/',
  ],
};
