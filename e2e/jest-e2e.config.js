/** @type {import('jest').Config} */
module.exports = {
  displayName: 'e2e',
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.e2e-spec.ts'],
  testTimeout: 60000,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/e2e/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};
