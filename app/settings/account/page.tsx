import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";

export default function SettingsAccountPage() {
  return (
    <div className="page-stack compact settings-stack">
      <section className="panel settings-account-card">
        <div className="settings-account-avatar" aria-hidden="true">
          <UiIcon name="person" className="settings-account-glyph" />
        </div>
        <div>
          <p className="settings-status-label">現在の状態</p>
          <p className="settings-card-title">この端末だけで使用中</p>
          <p className="settings-copy">現在はアカウントを作成していません。</p>
        </div>
      </section>

      <section className="panel settings-cloud-card">
        <p className="settings-cloud-eyebrow">Cloud版のご案内</p>
        <p className="settings-cloud-title">Cloud版にすると（予定）</p>
        <ul className="settings-bullet-list">
          <li>アカウントを作成できるようにする予定です</li>
          <li>家族との共有を使いやすくする予定です</li>
          <li>複数の端末で使いやすくする予定です</li>
          <li>自動バックアップに対応する予定です</li>
        </ul>
        <Link href="/settings/plans" className="action-button primary">
          Cloud版の案内を見る
        </Link>
      </section>

      <div className="settings-soft-note">
        <p>アカウントについても、難しい言葉を使わずに順番にご案内できる形を目指しています。</p>
      </div>
    </div>
  );
}
