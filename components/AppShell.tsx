"use client";

import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandAccountLink } from "@/components/BrandAccountLink";
import { BrandMark } from "@/components/BrandMark";
import { FirstSetup } from "@/components/FirstSetup";
import { MobileNav } from "@/components/MobileNav";
import { SettingsLink } from "@/components/SettingsLink";
import { SiteFooter } from "@/components/SiteFooter";
import { UiIcon } from "@/components/UiIcon";
import { WelcomeStart } from "@/components/WelcomeStart";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { shouldResumeSetup, shouldShowFirstSetup, clearResumeSetup } from "@/lib/shinromii-storage";

type OnboardingStep = "none" | "welcome" | "profile";

type PageMeta = {
  title: string;
  subtitle: string;
  /** Same glyph and tone as the matching feature card on the home screen. */
  icon?: ComponentProps<typeof UiIcon>["name"];
  tone?: "university" | "campus" | "ai" | "grades" | "profile";
};

const pageMeta: Record<string, PageMeta> = {
  "/": {
    title: "わたしの進路ノート",
    subtitle: "今日の進路状況を整理する",
  },
  "/grades": {
    title: "成績・評定",
    subtitle: "評定平均と資格を整えて記録",
    icon: "grades-fill",
    tone: "grades",
  },
  "/universities": {
    title: "大学・学部候補",
    subtitle: "候補を比べて、気持ちを言語化する",
    icon: "university-fill",
    tone: "university",
  },
  "/open-campus": {
    title: "オープンキャンパス",
    subtitle: "予定と参加後の感想をまとめる",
    icon: "campus",
    tone: "campus",
  },
  "/ai-notes": {
    title: "AI相談メモ",
    subtitle: "相談履歴をあとから見返しやすく",
    icon: "ai-fill",
    tone: "ai",
  },
  "/profile": {
    title: "マイ情報",
    subtitle: "今のわたしについて",
    icon: "person-fill",
    tone: "profile",
  },
  "/admin": {
    title: "管理・確認",
    subtitle: "開発・確認用ページ",
  },
  "/about": {
    title: "SHINROMiiについて",
    subtitle: "",
  },
  "/settings": {
    title: "設定",
    subtitle: "今の使い方やデータの扱いを確認する",
  },
  "/settings/plans": {
    title: "プラン・機能比較",
    subtitle: "使い方に合わせて選べるようにします",
  },
  "/settings/data-protection": {
    title: "データの守り方",
    subtitle: "どこに保存されるかを、わかりやすく確認",
  },
  "/settings/backup": {
    title: "バックアップ・データ管理",
    subtitle: "この端末のデータを守るための準備",
  },
  "/settings/family": {
    title: "家族との共有",
    subtitle: "今できることと、これからできるようにしたいこと",
  },
  "/settings/account": {
    title: "アカウント",
    subtitle: "この端末だけで使う場合の状態を確認",
  },
  "/guide": {
    title: "使い方",
    subtitle: "できるところから、少しずつ。",
  },
  "/privacy": {
    title: "プライバシーについて",
    subtitle: "この端末の中に保存されます。",
  },
  "/terms": {
    title: "利用規約",
    subtitle: "β版のご利用にあたって",
  },
  "/contact": {
    title: "お問い合わせ",
    subtitle: "SHINROMiiについてのご質問・ご意見・不具合のご連絡はこちら。",
  },
  "/support": {
    title: "SHINROMiiを応援する",
    subtitle: "高校生と家族が気軽に使える進路ノートを育てていく",
  },
};

const INFO_PATHS = new Set(["/about", "/guide", "/privacy", "/terms", "/contact", "/support"]);

const fallbackMeta: PageMeta = {
  title: "SHINROMii",
  subtitle: "進路の記録をやさしく整理",
};

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [onboarding, setOnboarding] = useState<OnboardingStep>("none");
  const [resumeSetup, setResumeSetup] = useState(false);
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminPreview = pathname.startsWith("/admin/preview");
  const isOnboarding = onboarding !== "none";
  const isWelcomeView = onboarding === "welcome" || pathname === "/admin/preview/welcome";
  const hideUserChrome = isOnboarding || isAdminPreview;
  const isHome = (pathname === "/" && !isOnboarding) || isWelcomeView;
  const isInfoPage = INFO_PATHS.has(pathname);
  const meta = pageMeta[pathname] ?? fallbackMeta;

  useEffect(() => {
    if (isAdminPath) {
      setOnboarding("none");
      setResumeSetup(false);
      return;
    }

    if (shouldResumeSetup()) {
      setResumeSetup(true);
      setOnboarding("profile");
      return;
    }

    setResumeSetup(false);

    if (!shouldShowFirstSetup()) {
      setOnboarding("none");
      return;
    }

    if (pathname === "/") {
      setOnboarding((current) => (current === "profile" ? "profile" : "welcome"));
      return;
    }

    setOnboarding("none");
  }, [isAdminPath, pathname]);

  return (
    <div className={`app-shell ${isHome ? "home-shell" : ""} ${hideUserChrome ? "setup-shell" : ""} ${isAdminPath ? "admin-shell" : ""} ${isInfoPage ? "info-shell" : ""}`}>
      <div className="app-backdrop" />
      <main className="mobile-frame">
        {isHome ? null : (
          <header className="topbar">
            <div className="brand-header">
              <div className="brand-header-copy">
                <Link href="/" className="brand-home-link" aria-label="ホームへ">
                  <span className="brand-lockup">
                    <BrandMark className="brand-mark" decorative />
                    <span className="brand-wordmark">
                      <span className="home-brand">SHINROMii</span>
                    </span>
                  </span>
                </Link>
                <p className="home-brand-sub">わたしの進路ノート</p>
              </div>
              <div className="home-hero-meta">
                <div className="home-hero-actions">
                  {hideUserChrome ? null : <BrandAccountLink />}
                  {hideUserChrome ? null : <SettingsLink />}
                </div>
                <span className="home-version">{APP_VERSION_LABEL}</span>
              </div>
            </div>
            {hideUserChrome ? null : (
              <div className="topbar-page">
                <div className="topbar-heading">
                  {meta.icon ? (
                    <span className={`topbar-icon tone-${meta.tone}`} aria-hidden="true">
                      <UiIcon name={meta.icon} className="topbar-glyph" />
                    </span>
                  ) : null}
                  <h1 className="topbar-title">{meta.title}</h1>
                </div>
                {meta.subtitle ? (
                  <p className={`topbar-subtitle${isInfoPage ? " info-page-lead" : ""}`}>{meta.subtitle}</p>
                ) : null}
              </div>
            )}
          </header>
        )}
        <div className="content-area">
          {onboarding === "welcome" ? (
            <WelcomeStart
              onStartFresh={() => setOnboarding("profile")}
              onRestored={() => setOnboarding("none")}
            />
          ) : onboarding === "profile" ? (
            <FirstSetup
              resume={resumeSetup}
              onFinished={() => {
                clearResumeSetup();
                setResumeSetup(false);
                setOnboarding("none");
                if (pathname !== "/") {
                  router.push("/");
                }
              }}
            />
          ) : (
            <>
              {children}
              {isAdminPath ? null : <SiteFooter currentPath={pathname} />}
            </>
          )}
        </div>
        {isOnboarding || isAdminPath ? null : <MobileNav />}
      </main>
    </div>
  );
}
