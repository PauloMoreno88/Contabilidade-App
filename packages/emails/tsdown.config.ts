import { defineConfig } from "tsdown";

// ESM + .d.ts so apps/api (nodenext, no JSX) imports compiled code. @exactra/shared ships raw TS
// without "type": "module", so it is bundled in (like apps/api does); npm deps stay external.
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  dts: { eager: true },
  deps: { alwaysBundle: ["@exactra/shared"] },
});
