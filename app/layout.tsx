import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHINROMII",
  description: "高校生本人と家族のための進路情報共有サービス、SHINROMII（シンロミー）。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
