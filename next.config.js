const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  images: { remotePatterns: [] },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
};
module.exports = nextConfig;
