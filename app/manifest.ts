import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SHINROMii",
    short_name: "SHINROMii",
    description: "高校生と家族のための進路情報UIベース",
    start_url: "/",
    display: "standalone",
    background_color: "#f7fafe",
    theme_color: "#2563eb",
    lang: "ja",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
