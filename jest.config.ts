// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const sharedTransform = {
  '^.+\\.tsx?$': ['ts-jest', {
    tsconfig: {
      jsx: 'react-jsx',
      esModuleInterop: true,
      module: 'commonjs',
    },
  }],
}

const config: Config = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '**/__tests__/lib/**/*.test.ts',
        '**/__tests__/api/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      transform: sharedTransform,
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '**/__tests__/onboarding/**/*.test.tsx',
        '**/__tests__/meals/**/*.test.tsx',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      transform: sharedTransform,
    },
  ],
}

export default createJestConfig(config)
