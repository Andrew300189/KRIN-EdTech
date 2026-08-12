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
  experimental: {
    optimizePackageImports: [
      "@hookform/resolvers",
      "date-fns",
      "framer-motion",
    ],
  },
};

module.exports = nextConfig;
