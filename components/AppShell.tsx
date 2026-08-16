"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/MobileNav";
import { UiIcon } from "@/components/UiIcon";

const titles: Record<string, string> = {
  "/": "わたしの進路ノート",
  "/grades": "成績・評定",
  "/universities": "大学・学部候補",
  "/open-campus": "オープンキャンパス",
  "/ai-notes": "AI相談メモ",
};

const subtitles: Record<string, string> = {
  "/": "今日の進路状況を整理する",
  "/grades": "評定平均と資格を整えて記録",
  "/universities": "候補を比べて、気持ちを言語化する",
  "/open-campus": "予定と参加後の感想をまとめる",
  "/ai-notes": "相談履歴をあとから見返しやすく",
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
          <div className="topbar-copy">
            <p className="brand-mark">SHINROMII</p>
            <h1 className="topbar-title">{titles[pathname] ?? "SHINROMII"}</h1>
            <p className="topbar-subtitle">{subtitles[pathname] ?? "進路の記録をやさしく整理"}</p>
          </div>
          <div className="household-badge">
            <UiIcon name="spark" className="household-icon" />
            <span>Ver.0.52</span>
          </div>
        </header>
        <div className="content-area">{children}</div>
        <MobileNav />
      </main>
    </div>
  );
}
