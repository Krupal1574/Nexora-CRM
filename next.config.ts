import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pg", "xlsx", "nodemailer"],
};

export default nextConfig;
