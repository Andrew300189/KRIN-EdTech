/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
