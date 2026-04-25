/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    moduleDirectories: ['node_modules', 'src'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    testEnvironment: 'node',
    testMatch: ['**/__integration__/**/*.int.spec.ts'],
    globalSetup: '<rootDir>/src/drivers/postgres/__integration__/globalSetup.ts',
    globalTeardown: '<rootDir>/src/drivers/postgres/__integration__/globalTeardown.ts',
    testTimeout: 60000,
    maxWorkers: 1,
};
