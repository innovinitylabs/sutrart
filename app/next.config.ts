import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pari/shared", "@pari/sdk"],
};

export default nextConfig;
