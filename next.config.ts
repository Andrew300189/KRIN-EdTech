/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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
