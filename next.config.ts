import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin workspace root to this project so Next.js doesn't pick up
  // a stray package-lock.json from a parent directory.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
