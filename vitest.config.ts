import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@reflexa/shared': path.resolve(__dirname, 'packages/shared/src'),
    },
  },
});
