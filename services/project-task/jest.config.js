/** @type {import('jest').Config} */
module.exports = {
  displayName: 'project-task',
  rootDir: '.',
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^generated/prisma/client$': '<rootDir>/generated/prisma/client',
    '^generated/prisma/client/(.*)$': '<rootDir>/generated/prisma/$1',
    '^@project-management/shared$': '<rootDir>/../../packages/shared/dist',
    '^@project-management/shared/(.*)$': '<rootDir>/../../packages/shared/dist/$1',
  },
  testEnvironment: 'node',
};
