import type { NextConfig } from "next";

// Static app shells contain no user records; Next inline boot scripts require unsafe-inline.
// Keep eval development-only. Never permit blob/data scripts, framing, plugins or external forms.
const csp = [
  "default-src 'self'", `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
  `connect-src 'self'${process.env.NODE_ENV === "development" ? " ws: wss:" : ""}`,
  "worker-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join("; ");
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "*.local"],
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "Cache-Control", value: "no-cache, must-revalidate, max-age=0" },
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ] },
      ...["/admin/:path*", "/api/:path*", "/sw.js"].map(source => ({ source, headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
      ] })),
    ];
  },
};
export default nextConfig;
