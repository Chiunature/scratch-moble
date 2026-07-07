module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: [
    '<rootDir>/apps/mobile/__tests__/**/*.test.ts?(x)',
    '<rootDir>/packages/**/test/**/*.test.ts',
    '<rootDir>/packages/**/tests/**/*.test.ts',
  ],
  moduleNameMapper: {
    '^@scratch-mobile/core$': '<rootDir>/packages/core/src',
    '^@scratch-mobile/protocol$': '<rootDir>/packages/protocol/src',
    '^@scratch-mobile/shared$': '<rootDir>/packages/shared/src',
    '^@scratch-mobile/ldr-engine$': '<rootDir>/packages/ldr-engine/src',
    '^@scratch-mobile/build-guide$': '<rootDir>/packages/build-guide/src',
  },
};
