"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/MobileNav";

const titles: Record<string, string> = {
  "/": "ホーム",
  "/grades": "成績・評定",
  "/universities": "大学・学部候補",
  "/open-campus": "オープンキャンパス",
  "/ai-notes": "AI相談メモ",
};

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <div className="app-backdrop" />
      <main className="mobile-frame">
        <header className="topbar">
          <div>
            <p className="brand-mark">SHINROMII</p>
            <h1 className="topbar-title">{titles[pathname] ?? "SHINROMII"}</h1>
          </div>
          <div className="household-badge">family</div>
        </header>
        <div className="content-area">{children}</div>
        <MobileNav />
      </main>
    </div>
  );
}
