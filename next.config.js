/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  images: { remotePatterns: [] },
};
module.exports = nextConfig;