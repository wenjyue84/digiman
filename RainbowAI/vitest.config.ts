import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/assistant/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['node_modules', 'dist', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules', 'dist', 'src/**/*.integration.test.ts', 'src/**/*.semantic.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          globals: true,
          environment: 'node',
          include: ['src/**/*.integration.test.ts'],
          exclude: ['node_modules', 'dist'],
        },
      },
      {
        test: {
          name: 'semantic',
          globals: true,
          environment: 'node',
          include: ['src/**/*.semantic.test.ts'],
          exclude: ['node_modules', 'dist'],
        },
      },
    ],
  },
});
