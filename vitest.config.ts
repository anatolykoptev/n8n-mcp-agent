import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/schemas/**/*.ts',
        'src/types/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/__tests__/**',
        'src/schemas/index.ts',
        'src/types/index.ts',
        'src/types/n8n.ts', // Pure type definitions, no runtime code
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
