import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
