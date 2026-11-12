import { defineConfig } from 'tsdown';

// Bundles @exactra/shared (raw TS) and the generated Prisma client; npm deps stay external.
export default defineConfig({
  // instrument.ts is its own entry: `node --import dist/instrument.mjs` starts Sentry before any other module.
  entry: ['src/main.ts', 'src/seed.ts', 'src/instrument.ts'],
  format: 'esm',
  platform: 'node',
  dts: false,
  deps: { alwaysBundle: ['@exactra/shared'] },
});
