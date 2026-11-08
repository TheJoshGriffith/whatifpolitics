import type { NextConfig } from "next";

/**
 * Static export: `npm run build` writes a self-contained site to `out/`.
 *
 * Hosting under a sub-path (e.g. https://example.org/what-if/)? Build with
 *   BASE_PATH=/what-if npm run build
 * and Next prefixes every link and asset for you. (A relative assetPrefix like
 * "./" is NOT used: with trailingSlash pages live in sub-folders, so "./_next"
 * would resolve to the wrong place on /sources/ etc.)
 */
const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || undefined;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
