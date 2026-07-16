import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin workspace root to this project so Next.js doesn't pick up
  // a stray package-lock.json from a parent directory.
  turbopack: {
    root: path.join(__dirname, "."),
  },
};

export default nextConfig;
