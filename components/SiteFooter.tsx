import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";
import { SITE_LINKS } from "@/lib/site-links";

type SiteFooterProps = {
  currentPath?: string;
};

export function SiteFooter({ currentPath }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer info-footer">
      <nav className="info-menu" aria-label="案内ページ">
        {SITE_LINKS.map((item) => {
          const current = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`info-menu-item${current ? " is-current" : ""}`}
              aria-current={current ? "page" : undefined}
            >
              <span>{item.label}</span>
              <UiIcon name="chevron-right" className="info-menu-chevron" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
      <p className="site-footer-copy">© {year} SHINROMii</p>
    </footer>
  );
}
