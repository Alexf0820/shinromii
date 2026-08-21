"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { BrandAccountLink } from "@/components/BrandAccountLink";
import { BrandMark } from "@/components/BrandMark";
import { SettingsLink } from "@/components/SettingsLink";
import { UiIcon } from "@/components/UiIcon";
import { DataProtectionGuide } from "@/components/settings/DataProtectionGuide";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { parseShinromiiBackupJson } from "@/lib/shinromii-backup";
import { saveShinromiiStorage } from "@/lib/shinromii-storage";

const HERO_IMAGE = "/images/shinromii-home-hero.png";
const HERO_IMAGE_WIDTH = 1024;
const HERO_IMAGE_HEIGHT = 661;
const HERO_IMAGE_SIZES = "(max-width: 639px) 100vw, 920px";

type WelcomeStartProps = {
  onStartFresh: () => void;
  onRestored: () => void;
  /** 管理プレビュー。保存・復元しない。 */
  preview?: boolean;
};

export function WelcomeStart({ onStartFresh, onRestored, preview = false }: WelcomeStartProps) {
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRestore(fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = parseShinromiiBackupJson(raw);

      if (!parsed.ok) {
        window.alert(parsed.error);
        setMessage(parsed.error);
        return;
      }

      if (preview) {
        setMessage("プレビューでは保存データを変更しません。");
        return;
      }

      const confirmed = window.confirm("このバックアップの内容でSHINROMiiを開始しますか？");

      if (!confirmed) {
        setMessage("バックアップからの復元をキャンセルしました。");
        return;
      }

      saveShinromiiStorage(parsed.storage);
      onRestored();
    } catch {
      const error =
        "バックアップファイルを読み込めませんでした。SHINROMiiで作成したバックアップファイルか確認してください。";
      window.alert(error);
      setMessage(error);
    }
  }

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
              <span className="home-version">{APP_VERSION_LABEL}</span>
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

        <DataProtectionGuide showLink />

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
              <span>アカウントを作成</span>
              <span>家族と共有</span>
              <span>複数端末で利用・自動バックアップ</span>
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
          <button
            type="button"
            className="action-button"
            onClick={() => restoreInputRef.current?.click()}
          >
            <UiIcon name="upload" className="action-icon" />
            バックアップから復元
          </button>
        </div>

        <p className="welcome-legal">
          <Link href="/privacy">プライバシー</Link>
          <span aria-hidden="true">・</span>
          <Link href="/terms">利用規約</Link>
        </p>
      </div>

      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          void handleRestore(event.target.files);
          event.target.value = "";
        }}
      />

      {message ? <p className="welcome-message">{message}</p> : null}
    </section>
  );
}
