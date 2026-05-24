import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
