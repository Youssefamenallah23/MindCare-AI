import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ["assets.aceternity.com"],
  },
  experimental: {
    serverActions: {
      // Set the body size limit to accommodate larger file uploads.
      // For a 300KB PDF, '4mb' should be more than sufficient,
      // accounting for multipart/form-data overhead.
      // You can increase this further (e.g., '10mb', '50mb') if you expect larger files.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
