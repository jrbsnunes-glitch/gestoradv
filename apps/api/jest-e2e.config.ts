import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.e2e.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@master-db$': '<rootDir>/../../packages/database/generated/master',
    '^@master-db/(.*)$': '<rootDir>/../../packages/database/generated/master/$1',
  },
  globalSetup: '<rootDir>/test/global-setup.e2e.ts',
  globalTeardown: '<rootDir>/test/global-teardown.e2e.ts',
  setupFilesAfterEnv: ['<rootDir>/test/setup-env.e2e.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
};

export default config;
