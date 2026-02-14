import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['src/__tests__/**/*.{test,spec}.{ts,tsx,js}'],
          exclude: ['node_modules', 'dist'],
        },
      },
      {
        test: {
          name: 'semantic',
          globals: true,
          environment: 'node',
          include: ['src/assistant/__tests__/**/*.{test,spec}.{ts,tsx,js}'],
          exclude: ['node_modules', 'dist'],
        },
      },
      {
        test: {
          name: 'integration',
          globals: true,
          environment: 'node',
          include: ['src/integration/**/*.{test,spec}.{ts,tsx,js}'],
          exclude: ['node_modules', 'dist'],
        },
      },
    ],
  },
});
