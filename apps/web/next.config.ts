import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const isDevelopment = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders(isDevelopment),
      },
    ];
  },
};

export default nextConfig;
