module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: [
    '<rootDir>/apps/mobile/__tests__/**/*.test.ts?(x)',
    '<rootDir>/packages/**/test/**/*.test.ts',
  ],
  moduleNameMapper: {
    '^@scratch-mobile/core$': '<rootDir>/packages/core/src',
    '^@scratch-mobile/protocol$': '<rootDir>/packages/protocol/src',
    '^@scratch-mobile/shared$': '<rootDir>/packages/shared/src',
  },
};
