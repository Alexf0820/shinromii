"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { BrandAccountLink } from "@/components/BrandAccountLink";
import { BrandMark } from "@/components/BrandMark";
import { UiIcon } from "@/components/UiIcon";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { parseShinromiiBackupJson } from "@/lib/shinromii-backup";
import { saveShinromiiStorage } from "@/lib/shinromii-storage";

const HERO_IMAGE = "/images/shinromii-home-hero.png";
const HERO_IMAGE_WIDTH = 1024;
const HERO_IMAGE_HEIGHT = 661;
const HERO_IMAGE_SIZES = "(max-width: 639px) 100vw, 920px";

const welcomeFeatures = [
  { icon: "grades-fill" as const, label: "成績や資格" },
  { icon: "university-fill" as const, label: "気になる大学" },
  { icon: "campus" as const, label: "オープンキャンパス" },
  { icon: "ai-fill" as const, label: "AIに相談したこと" },
];

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
              <BrandAccountLink />
              <span className="home-version">{APP_VERSION_LABEL}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="welcome-body">
        <div className="welcome-copy">
          <h1 className="welcome-title">進路のこと、ひとつにまとめよう。</h1>
          <p className="welcome-tagline">未来のわたしへ、今日から一歩。</p>
          <ul className="welcome-features">
            {welcomeFeatures.map((item) => (
              <li key={item.label}>
                <span className="welcome-feature-icon" aria-hidden="true">
                  <UiIcon name={item.icon} className="welcome-feature-glyph" />
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="welcome-privacy">
          <span className="welcome-note-icon" aria-hidden="true">
            <UiIcon name="lock" className="welcome-note-glyph" />
          </span>
          <div>
            <p className="welcome-privacy-title">進路情報は、この端末の中だけに保存されます</p>
            <p className="welcome-privacy-text">
              入力した成績・大学候補・進路情報などが、SHINROMiiのサーバーへ送信されることはありません。
            </p>
          </div>
        </div>

        <div className="welcome-actions">
          <button type="button" className="welcome-choice primary" onClick={onStartFresh}>
            <span className="welcome-choice-icon" aria-hidden="true">
              <UiIcon name="edit" className="welcome-choice-glyph" />
            </span>
            <span className="welcome-choice-copy">
              <strong>はじめて使う</strong>
              <span>新しく進路ノートをはじめる</span>
            </span>
            <UiIcon name="chevron-right" className="welcome-choice-arrow" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="welcome-choice"
            onClick={() => restoreInputRef.current?.click()}
          >
            <span className="welcome-choice-icon" aria-hidden="true">
              <UiIcon name="download" className="welcome-choice-glyph" />
            </span>
            <span className="welcome-choice-copy">
              <strong>バックアップからはじめる</strong>
              <span>以前のSHINROMiiのデータを引き継ぐ</span>
            </span>
            <UiIcon name="chevron-right" className="welcome-choice-arrow" aria-hidden="true" />
          </button>
        </div>

        <div className="welcome-tip">
          <span className="welcome-note-icon" aria-hidden="true">
            <UiIcon name="bulb" className="welcome-note-glyph" />
          </span>
          <div>
            <p className="welcome-privacy-title">あとからいつでも変更できます</p>
            <p className="welcome-privacy-text">
              学年や気になる大学など、いつでも編集できます。空のままではじめても大丈夫です。
            </p>
          </div>
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
