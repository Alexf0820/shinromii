import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { PwaRegistration } from "@/components/PwaRegistration";
import { APP_VERSION_LABEL } from "@/lib/app-version";

export const metadata: Metadata = {
  title: `SHINROMii ${APP_VERSION_LABEL}`,
  description: "高校生と家族のための進路情報UIベース",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SHINROMii",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>
        <PwaRegistration />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
