/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typescript: {
    tsconfigPath: process.env.NEXT_DIST_DIR ? "tsconfig.build.json" : "tsconfig.json",
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: [
      "@hookform/resolvers",
      "date-fns",
      "framer-motion",
    ],
  },
};

module.exports = nextConfig;
