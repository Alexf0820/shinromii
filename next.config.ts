import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 実機確認でLAN経由（http://192.168.x.x:PORT）から dev サーバーを開くと、
  // Next の dev リソースが cross-origin 扱いになり 403 で止まる。
  // その結果クライアントチャンクが読み込めず、hydration されずボタンが反応しなくなる。
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "*.local"],
  // iPhone Safari が古い HTML を戻すのを防ぐ（dev 実機確認用）
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
