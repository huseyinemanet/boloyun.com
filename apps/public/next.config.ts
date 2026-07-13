import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
};

export default nextConfig;
