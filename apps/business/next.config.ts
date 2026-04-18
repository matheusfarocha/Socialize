import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@socialize/shared", "@socialize/ui"],
};

export default nextConfig;
