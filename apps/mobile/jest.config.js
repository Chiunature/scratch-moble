module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@scratch-mobile/core$': '<rootDir>/../../packages/core/src',
    '^@scratch-mobile/protocol$': '<rootDir>/../../packages/protocol/src',
    '^@scratch-mobile/shared$': '<rootDir>/../../packages/shared/src',
  },
};
