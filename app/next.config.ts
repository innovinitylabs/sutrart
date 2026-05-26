import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sutrart/shared", "@sutrart/sdk"],
};

export default nextConfig;
