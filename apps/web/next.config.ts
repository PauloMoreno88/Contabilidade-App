import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // @exactra/shared ships TypeScript source.
  transpilePackages: ["@exactra/shared"],
};

export default nextConfig;
