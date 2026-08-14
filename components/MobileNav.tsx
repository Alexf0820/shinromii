"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "ホーム", icon: "○" },
  { href: "/grades", label: "成績", icon: "△" },
  { href: "/universities", label: "大学", icon: "□" },
  { href: "/open-campus", label: "OC", icon: "◇" },
  { href: "/ai-notes", label: "AIメモ", icon: "◎" },
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
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
