import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
    env: {
      GOOGLE_API_KEY: 'test-key-not-real',
      PHOENIX_API_KEY: 'test-key-not-real',
      PHOENIX_COLLECTOR_ENDPOINT: 'http://localhost:6006/v1/traces',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key-not-real',
      FRONTEND_ORIGIN: 'http://localhost:5173',
    },
  },
  resolve: {
    alias: {
      '@reflexa/shared': path.resolve(__dirname, 'packages/shared/src'),
    },
  },
});
