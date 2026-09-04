import Link from "next/link";
import { ProgressionStageSettingsCard } from "@/components/settings/ProgressionStageSettingsCard";
import { UiIcon } from "@/components/UiIcon";

const menuItems = [
  { href: "/settings/app-update", title: "バージョン・更新", icon: "settings" as const },
  { href: "/settings/plans", title: "プラン・機能比較", icon: "spark" as const },
  { href: "/settings/data-protection", title: "データの守り方", icon: "lock" as const },
  { href: "/settings/backup", title: "バックアップ・データ管理", icon: "download" as const },
  { href: "/settings/family", title: "家族との共有", icon: "person-fill" as const },
  { href: "/settings/account", title: "アカウント", icon: "person" as const },
  { href: "/about", title: "SHINROMiiについて", icon: "detail" as const },
] as const;

export default function SettingsPage() {
  return (
    <div className="page-stack compact settings-stack">
      <section className="panel settings-status-card">
        <div className="settings-status-icon" aria-hidden="true">
          <UiIcon name="lock" className="settings-status-glyph" />
        </div>
        <div>
          <p className="settings-status-label">現在の利用方法</p>
          <p className="settings-status-title">この端末だけで使用中</p>
          <p className="settings-status-text">
            登録なしで使っています。今の進路情報は、この端末の中に保存されています。
          </p>
        </div>
      </section>

      <ProgressionStageSettingsCard />

      <section className="settings-menu-section">
        <p className="settings-section-label">設定メニュー</p>
        <nav className="settings-menu" aria-label="設定メニュー">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} className="settings-menu-item">
              <span className="settings-menu-icon" aria-hidden="true">
                <UiIcon name={item.icon} className="settings-menu-glyph" />
              </span>
              <span className="settings-menu-text">{item.title}</span>
              <UiIcon name="chevron-right" className="settings-menu-arrow" aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>

      <section className="panel settings-cloud-card">
        <p className="settings-cloud-eyebrow">Cloud版のご案内</p>
        <p className="settings-cloud-title">Cloud版で、もっと便利に（予定）</p>
        <p className="settings-cloud-text">
          今まで入力したデータは、そのまま引き継げる予定です。家族との共有、複数端末での利用、自動バックアップに対応できるよう準備しています。
        </p>
        <Link href="/settings/plans" className="action-button primary">
          Cloud版の案内を見る
        </Link>
      </section>
    </div>
  );
}
