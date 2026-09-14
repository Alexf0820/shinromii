"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandAccountLink } from "@/components/BrandAccountLink";
import { BrandMark } from "@/components/BrandMark";
import { SettingsLink } from "@/components/SettingsLink";
import { UiIcon } from "@/components/UiIcon";
import { APP_VERSION_LABEL, IS_BETA } from "@/lib/app-version";
import { BackupFileActions } from "@/components/BackupFileActions";

const HERO_IMAGE = "/images/shinromii-home-hero.png";
const HERO_IMAGE_WIDTH = 1024;
const HERO_IMAGE_HEIGHT = 661;
const HERO_IMAGE_SIZES = "(max-width: 639px) 100vw, 920px";
const DATA_PROTECTION_GUIDE_IMAGE = "/images/data-protection-guide-confirmed.jpg";
const DATA_PROTECTION_GUIDE_WIDTH = 1280;
const DATA_PROTECTION_GUIDE_HEIGHT = 798;

type WelcomeStartProps = {
  onStartFresh: () => void;
  onRestored: () => void;
  /** 管理プレビュー。保存・復元しない。 */
  preview?: boolean;
};

export function WelcomeStart({ onStartFresh, onRestored, preview = false }: WelcomeStartProps) {

  return (
    <section className="welcome-start">
      <div className="home-hero welcome-hero">
        <Image
          className="home-hero-fill"
          src={HERO_IMAGE}
          alt=""
          aria-hidden="true"
          width={HERO_IMAGE_WIDTH}
          height={HERO_IMAGE_HEIGHT}
          sizes={HERO_IMAGE_SIZES}
          priority
        />
        <div className="home-hero-frame">
          <Image
            className="home-hero-photo"
            src={HERO_IMAGE}
            alt="未来の自分に、今の自分ができることを。"
            width={HERO_IMAGE_WIDTH}
            height={HERO_IMAGE_HEIGHT}
            sizes={HERO_IMAGE_SIZES}
            priority
          />
        </div>
        <div className="home-hero-inner">
          <div className="home-hero-head">
            <div className="home-hero-brand">
              <div className="brand-lockup">
                <BrandMark className="brand-mark" decorative />
                <div className="brand-wordmark">
                  <p className="home-brand">SHINROMii</p>
                  <p className="home-brand-sub">わたしの進路ノート</p>
                </div>
              </div>
            </div>
            <div className="home-hero-meta">
              <div className="home-hero-actions">
                {preview ? null : <BrandAccountLink />}
                {preview ? null : <SettingsLink />}
              </div>
              <span className="home-version app-version"><span>{APP_VERSION_LABEL}</span>{IS_BETA && <span className="app-version-beta">ベータ版</span>}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="welcome-body">
        <div className="welcome-copy">
          <h1 className="welcome-title">SHINROMiiをはじめる</h1>
          <p className="welcome-intro">
            進路情報を、自分だけでも家族とでも整理できます。
          </p>
        </div>

        <section
          className="welcome-data-guide"
          aria-label="データの守り方。くわしく見るから詳細ページへ進めます。"
        >
          <div className="welcome-data-guide-head">
            <Link href="/settings/data-protection" className="data-guide-link">
              くわしく見る
            </Link>
          </div>
          <div className="welcome-data-guide-image-frame">
            <Image
              className="welcome-data-guide-image"
              src={DATA_PROTECTION_GUIDE_IMAGE}
              alt="SHINROMiiのデータの守り方。この端末への保存、暗号化したCloud保存、家族との共有について説明"
              width={DATA_PROTECTION_GUIDE_WIDTH}
              height={DATA_PROTECTION_GUIDE_HEIGHT}
              sizes="(max-width: 639px) calc(100vw - 32px), 720px"
              priority
            />
          </div>
        </section>

        <div className="welcome-actions">
          <button type="button" className="welcome-choice primary" onClick={onStartFresh}>
            <span className="welcome-choice-icon" aria-hidden="true">
              <UiIcon name="edit" className="welcome-choice-glyph" />
            </span>
            <span className="welcome-choice-copy">
              <strong>この端末だけで無料ではじめる</strong>
              <span>登録不要</span>
              <span>件数制限なし</span>
              <span>いつでもCloud版へ変更できます</span>
            </span>
            <UiIcon name="chevron-right" className="welcome-choice-arrow" aria-hidden="true" />
          </button>
          <Link href="/settings/plans" className="welcome-choice">
            <span className="welcome-choice-icon" aria-hidden="true">
              <UiIcon name="cloud" className="welcome-choice-glyph" />
            </span>
            <span className="welcome-choice-copy">
              <strong>家族・複数端末で使う</strong>
              <span>アカウントを作成して使う予定です</span>
              <span>家族と共有できるようにする予定です</span>
              <span>複数端末で使えて、自動バックアップも使える予定です</span>
            </span>
            <UiIcon name="chevron-right" className="welcome-choice-arrow" aria-hidden="true" />
          </Link>
        </div>

        <div className="welcome-tip">
          <span className="welcome-note-icon" aria-hidden="true">
            <UiIcon name="bulb" className="welcome-note-glyph" />
          </span>
          <div>
            <p className="welcome-privacy-title">あとからいつでも変更できます</p>
            <p className="welcome-privacy-text">
              最初はこの端末だけで使い、必要になったときにCloud版を選ぶ形も予定しています。
            </p>
          </div>
        </div>

        <div className="welcome-secondary-actions">
          <BackupFileActions restoreOnly preview={preview} onRestored={onRestored} />
        </div>

        <p className="welcome-legal">
          <Link href="/privacy">プライバシー</Link>
          <span aria-hidden="true">・</span>
          <Link href="/terms">利用規約</Link>
        </p>
      </div>


    </section>
  );
}
