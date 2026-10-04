import { defineConfig } from 'tsdown';

// Bundles @exactra/shared (raw TS) and the generated Prisma client; npm deps stay external.
export default defineConfig({
  entry: ['src/main.ts', 'src/seed.ts'],
  format: 'esm',
  platform: 'node',
  dts: false,
  deps: { alwaysBundle: ['@exactra/shared'] },
});
