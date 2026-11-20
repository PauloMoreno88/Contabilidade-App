import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Unit tests: pure functions next to the code, no database or Nest app (those are in vitest.config.e2e.ts).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
