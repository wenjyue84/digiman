/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testPathIgnorePatterns: [
    '<rootDir>/RainbowAI/',
  ],
  collectCoverageFrom: [
    'server/**/*.ts',
    'shared/**/*.ts',
    '!**/*.d.ts',
  ],
  testTimeout: 5000,
  verbose: true,
};
