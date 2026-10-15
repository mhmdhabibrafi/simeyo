import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "true"
    ? { output: "standalone" as const, outputFileTracingRoot: path.resolve(__dirname, "../..") }
    : {}),
  devIndicators: false,
  /* config options here */
  async rewrites() {
    const backend = process.env.API_ORIGIN || "http://localhost:8000";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/sanctum/:path*", destination: `${backend}/sanctum/:path*` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ];
  },
  async headers() {
    return [
      {source:"/sw.js",headers:[{key:"Cache-Control",value:"no-store, max-age=0"},{key:"Service-Worker-Allowed",value:"/"}]},
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
