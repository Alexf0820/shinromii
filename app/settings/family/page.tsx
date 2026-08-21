import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";

export default function SettingsFamilyPage() {
  return (
    <div className="page-stack compact settings-stack">
      <section className="panel settings-card-block">
        <p className="settings-mini-label">無料版での共有方法</p>
        <p className="settings-card-title">バックアップを渡して共有できます</p>
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

      <section className="panel settings-family-benefit-card">
        <p className="settings-mini-label">Cloud版で使うと（予定）</p>
        <p className="settings-card-title">家族で見やすくする準備を進めています</p>
        <ul className="settings-bullet-list">
          <li>家族が最新の進路情報を見やすくなる予定です</li>
          <li>別の端末からも同じ内容を確認できるようにする予定です</li>
          <li>必要な人だけが確認できる形を目指しています</li>
        </ul>
      </section>

      <section className="panel settings-cloud-card">
        <p className="settings-cloud-eyebrow">Cloud版のご案内</p>
        <p className="settings-cloud-title">Cloud版なら、もっと手間なく共有へ（予定）</p>
        <p className="settings-cloud-text">
          家族が自動で最新の情報を見られるようにし、別の端末からも同じ内容を使えるようにする予定です。
        </p>
        <Link href="/settings/plans" className="action-button primary">
          Cloud版の案内を見る
        </Link>
      </section>

      <div className="settings-soft-note">
        <p>お子さまと保護者で、進路を一緒に考えやすくするための形を整えています。</p>
      </div>
    </div>
  );
}
