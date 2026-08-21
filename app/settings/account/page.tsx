import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";

export default function SettingsAccountPage() {
  return (
    <div className="page-stack compact settings-stack">
      <section className="panel settings-account-card">
        <div className="settings-account-avatar" aria-hidden="true">
          <UiIcon name="person" className="settings-account-glyph" />
        </div>
        <p className="settings-card-title">この端末だけで使用中のため、アカウントはまだ作られていません。</p>
      </section>

      <section className="panel settings-cloud-card">
        <p className="settings-cloud-title">Cloud版にすると</p>
        <ul className="settings-bullet-list">
          <li>アカウントを作成できます</li>
          <li>家族との共有がしやすくなります</li>
          <li>複数の端末で使いやすくなります</li>
          <li>自動バックアップが使えるようになる予定です</li>
        </ul>
        <Link href="/settings/plans" className="action-button primary">
          Cloud版で使う
        </Link>
      </section>

      <div className="settings-soft-note">
        <p>アカウントについても、難しい言葉を使わずに順番にご案内できる形を目指しています。</p>
      </div>
    </div>
  );
}
