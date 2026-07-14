import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const isDevelopment = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https:`,
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https:",
  "frame-src https:",
  "object-src 'self' https:",
  "worker-src 'self' blob:",
  ...(!isDevelopment ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.boloyun.com" }],
        destination: "https://boloyun.com/:path*",
        permanent: true,
      },
      { source: "/admin/settings", destination: "/admin/settings/general", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
      {
        source: "/kategori/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=3600" }],
      },
      {
        source: "/etiket/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=3600" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.minijuegosgratis.com",
      },
      {
        protocol: "https",
        hostname: "www.miniplay.com",
      },
      {
        protocol: "https",
        hostname: "cdn.boloyun.com",
      },
    ],
  },
};

export default nextConfig;
