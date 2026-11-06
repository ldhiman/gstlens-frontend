import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "192.168.31.156:3000",
    "192.168.31.199:3000",
    "192.168.31.199",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.31.156:3000",
    "http://192.168.31.199:3000",
  ],
};

export default nextConfig;
