"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UiIcon } from "@/components/UiIcon";

const items = [
  { href: "/", label: "ホーム", icon: "home" },
  { href: "/grades", label: "成績・資格", icon: "grades" },
  { href: "/universities", label: "大学候補", icon: "university" },
  { href: "/open-campus", label: "OC", icon: "campus" },
  { href: "/ai-notes", label: "AI相談", icon: "ai" },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav" aria-label="主要ナビゲーション">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon-wrap" aria-hidden="true">
              <UiIcon name={item.icon} className="nav-icon" />
            </span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
