import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: process.env.NEXT_PUBLIC_URL || '',
  allowedDevOrigins: ['9a63-68-237-105-230.ngrok-free.app'],
};

export default nextConfig;