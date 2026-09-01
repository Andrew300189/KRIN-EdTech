/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A stale Windows file handle can occasionally keep `.next/dev/lock`
  // unavailable after a dev server has exited. Keep the development cache
  // isolated, while production builds continue to use the standard `.next`.
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
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
    // These libraries expose large barrel exports. Let Next rewrite the
    // imports to the exact icons/chart modules used by each client route.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Preserve the purchase-oriented course URL without capturing the
        // reserved CEFR curriculum pages (/courses/a1 through /courses/c2).
        // Two-segment level/topic routes are excluded by the matcher itself.
        { source: "/courses/:slug((?!(?:a1|a2|b1|b2|c1|c2)$)[^/]+)", destination: "/course-detail/:slug" },
        { source: "/pricing", destination: "/pricing-detail" },
      ],
    };
  },
};

module.exports = nextConfig;
