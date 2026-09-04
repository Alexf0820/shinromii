"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UiIcon } from "@/components/UiIcon";

const items = [
  { href: "/", label: "ホーム", icon: "home", activeIcon: "home-fill" },
  { href: "/grades", label: "成績・資格", icon: "grades", activeIcon: "grades-fill" },
  { href: "/universities", label: "大学候補", icon: "university", activeIcon: "university-fill" },
  { href: "/open-campus", label: "OC", icon: "campus", activeIcon: "campus-fill" },
  { href: "/ai-notes", label: "相談メモ", icon: "ai", activeIcon: "ai-fill" },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav" aria-label="主要ナビゲーション">
      <div className="mobile-nav-inner">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="nav-indicator" aria-hidden="true" />
              <span className="nav-icon-wrap" aria-hidden="true">
                <UiIcon name={isActive ? item.activeIcon : item.icon} className="nav-icon" />
              </span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
