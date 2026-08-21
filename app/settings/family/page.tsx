import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";

export default function SettingsFamilyPage() {
  return (
    <div className="page-stack compact settings-stack">
      <section className="panel settings-card-block">
        <p className="settings-card-title">無料版での共有方法</p>
        <p className="settings-copy">
          バックアップを作って、家族に渡すことで共有できます。今の無料版でも、必要なときに受け渡しできます。
        </p>
        <div className="settings-family-flow" aria-hidden="true">
          <span className="settings-family-chip">
            <UiIcon name="person" className="settings-family-glyph" />
            あなた
          </span>
          <span className="settings-family-arrow">→</span>
          <span className="settings-family-chip">
            <UiIcon name="download" className="settings-family-glyph" />
            バックアップ
          </span>
          <span className="settings-family-arrow">→</span>
          <span className="settings-family-chip">
            <UiIcon name="person-fill" className="settings-family-glyph" />
            家族
          </span>
        </div>
        <Link href="/settings/backup" className="action-button">
          バックアップを作成する
        </Link>
      </section>

      <section className="panel settings-cloud-card">
        <p className="settings-cloud-title">Cloud版ならもっと便利に</p>
        <p className="settings-cloud-text">
          家族が自動で最新の情報を見られるようにし、別の端末からも同じ内容を使えるようにする予定です。
        </p>
        <Link href="/settings/plans" className="action-button primary">
          Cloud版で使う
        </Link>
      </section>

      <div className="settings-soft-note">
        <p>お子さまと保護者で、進路を一緒に考えやすくするための形を整えています。</p>
      </div>
    </div>
  );
}
