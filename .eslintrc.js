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
  overrides: [
    {
      // 第三方 vendored LDraw 引擎代码：依赖运行时注入的跨文件全局
      // （globalThis.LDR / globalThis.THREE / OutlinePass 等），保持原样，
      // 关闭 no-undef 而非逐文件声明全局，避免改动第三方逻辑。
      files: ['packages/ldr-engine/src/vendor/**/*.js'],
      rules: {
        'no-undef': 'off',
      },
    },
  ],
};
