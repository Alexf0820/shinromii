"use client";

import Image from "next/image";
import Link from "next/link";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandAccountLink } from "@/components/BrandAccountLink";
import { UiIcon } from "@/components/UiIcon";
import { recentItems } from "@/data/mockData";
import {
  formatBackupFileName,
  parseShinromiiBackupJson,
  stringifyShinromiiBackup,
} from "@/lib/shinromii-backup";
import {
  formatAutosaveDateTime,
  loadAutosaveHistory,
  type AutosaveHistoryEntry,
} from "@/lib/shinromii-autosave";
import type { ShinromiiStorage } from "@/lib/shinromii-storage";
import { loadShinromiiStorage, parseBackupStorageData, saveShinromiiStorage } from "@/lib/shinromii-storage";

const HERO_IMAGE = "/images/shinromii-home-hero.png";
const HERO_IMAGE_WIDTH = 1024;
const HERO_IMAGE_HEIGHT = 661;
const HERO_IMAGE_SIZES = "(max-width: 639px) 100vw, 920px";

const schoolYearRank = {
  高1: 1,
  高2: 2,
  高3: 3,
} as const;

const termRank = {
  "1学期": 1,
  "2学期": 2,
  "3学期": 3,
  学年末: 4,
} as const;

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverage(value: number | null) {
  return value === null ? "-" : value.toFixed(1);
}

function formatMonthDay(isoDate: string) {
  const [, month, day] = isoDate.split("-");

  if (!month || !day) {
    return isoDate;
  }

  return `${Number(month)}/${Number(day)}`;
}

function formatTodayLabel(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function createFallbackSummary(): ShinromiiStorage | null {
  return null;
}

const featureItems = [
  {
    href: "/universities",
    title: "大学・学部候補",
    description: ["気になる大学を", "比較・整理する"],
    icon: "university-fill" as const,
    tone: "university",
  },
  {
    href: "/open-campus",
    title: "オープンキャンパス",
    description: ["参加記録や評価を", "残す"],
    icon: "campus" as const,
    tone: "campus",
  },
  {
    href: "/ai-notes",
    title: "AI相談メモ",
    description: ["AIとの相談内容を", "記録・管理する"],
    icon: "ai-fill" as const,
    tone: "ai",
  },
  {
    href: "/grades",
    title: "成績・資格",
    description: ["評定や資格を", "記録・管理する"],
    icon: "grades-fill" as const,
    tone: "grades",
  },
];

export function HomeClient() {
  const [storage, setStorage] = useState<ShinromiiStorage | null>(createFallbackSummary());
  const [todayLabel, setTodayLabel] = useState<string | null>(null);
  const [dataManagementMessage, setDataManagementMessage] = useState<string | null>(null);
  const [autosaveHistory, setAutosaveHistory] = useState<AutosaveHistoryEntry[]>([]);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStorage(loadShinromiiStorage());
    setAutosaveHistory(loadAutosaveHistory());
    setTodayLabel(formatTodayLabel(new Date()));
  }, []);

  const latestGrade = useMemo(() => {
    if (!storage || storage.gradeRecords.length === 0) {
      return { value: null as number | null, termLabel: null as string | null };
    }

    const sorted = [...storage.gradeRecords].sort((a, b) => {
      if (a.schoolYear !== b.schoolYear) {
        return schoolYearRank[b.schoolYear] - schoolYearRank[a.schoolYear];
      }

      return termRank[b.term] - termRank[a.term];
    });

    const latest = sorted[0];
    const target = storage.gradeRecords
      .filter((item) => item.schoolYear === latest.schoolYear && item.term === latest.term)
      .map((item) => item.grade);

    return {
      value: average(target),
      termLabel: `${latest.schoolYear} ${latest.term}`,
    };
  }, [storage]);

  const latestQualification = useMemo(() => {
    if (!storage || storage.qualifications.length === 0) {
      return null;
    }

    return [...storage.qualifications].sort((a, b) => b.examDate.localeCompare(a.examDate))[0];
  }, [storage]);

  const upcomingCampusCount = useMemo(() => {
    if (!storage) {
      return null;
    }

    return storage.openCampusEvents.filter(
      (item) => item.status === "検討中" || item.status === "予約済み",
    ).length;
  }, [storage]);

  const recentNotes = useMemo(() => {
    if (!storage) {
      return [];
    }

    return [...storage.aiNotes]
      .sort((a, b) => b.consultedAt.localeCompare(a.consultedAt))
      .slice(0, 2);
  }, [storage]);

  const summaryItems = [
    {
      href: "/grades#grades",
      label: "評定平均",
      value: formatAverage(latestGrade.value),
      unit: "",
      note: latestGrade.termLabel ? `最新 ${latestGrade.termLabel}` : "未登録",
    },
    {
      href: "/grades#qualifications",
      label: "資格・検定",
      value: latestQualification
        ? `${latestQualification.name}${latestQualification.scoreOrLevel}`
        : storage
          ? "0"
          : "-",
      unit: latestQualification ? "" : storage ? "件" : "",
      note: latestQualification ? latestQualification.status : "未登録",
      compactValue: Boolean(latestQualification),
    },
    {
      href: "/universities",
      label: "大学候補",
      value: storage ? `${storage.universityCandidates.length}` : "-",
      unit: storage ? "校" : "",
      note: "登録済み",
    },
    {
      href: "/open-campus",
      label: "OC参加予定",
      value: upcomingCampusCount === null ? "-" : `${upcomingCampusCount}`,
      unit: upcomingCampusCount === null ? "" : "件",
      note: "今後の予定",
    },
  ];

  function handleBackupExport() {
    const current = loadShinromiiStorage();
    const backupJson = stringifyShinromiiBackup(current);
    const blob = new Blob([backupJson], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = formatBackupFileName(new Date());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);

    setDataManagementMessage("バックアップを保存しました。");
  }

  function refreshAutosaveHistory() {
    setAutosaveHistory(loadAutosaveHistory());
  }

  function handleAutosaveRestore(entry: AutosaveHistoryEntry) {
    const label = formatAutosaveDateTime(entry.savedAt);
    const confirmed = window.confirm(
      `${label} の状態に戻しますか？\n現在のデータは置き換わります。`,
    );

    if (!confirmed) {
      setDataManagementMessage("自動保存の履歴からの復元をキャンセルしました。");
      return;
    }

    const restored = parseBackupStorageData(entry.data);

    if (!restored) {
      const message = "この履歴は読み込めなかったため、現在のデータはそのままです。";
      window.alert(message);
      setDataManagementMessage(message);
      return;
    }

    saveShinromiiStorage(restored);
    setStorage(restored);
    setAutosaveHistory(loadAutosaveHistory());
    setDataManagementMessage("自動保存の履歴から復元しました。");
  }

  async function handleBackupImport(fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = parseShinromiiBackupJson(raw);

      if (!parsed.ok) {
        window.alert(parsed.error);
        setDataManagementMessage(parsed.error);
        return;
      }

      const confirmed = window.confirm(
        "今のSHINROMiiのデータは、選んだバックアップの内容に置き換わります。よろしいですか？",
      );

      if (!confirmed) {
        setDataManagementMessage("バックアップからの復元をキャンセルしました。");
        return;
      }

      saveShinromiiStorage(parsed.storage);
      setStorage(parsed.storage);
      setAutosaveHistory(loadAutosaveHistory());
      setDataManagementMessage("バックアップから復元し、保存データを置き換えました。");
      window.alert("バックアップから復元しました。");
    } catch {
      const message =
        "バックアップファイルを読み込めませんでした。SHINROMiiで作成したバックアップファイルか確認してください。";
      window.alert(message);
      setDataManagementMessage(message);
    }
  }

  return (
    <div className="home-page">
      <section className="home-hero">
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
              <p className="home-brand">SHINROMii</p>
              <p className="home-brand-sub">わたしの進路ノート</p>
            </div>
            <div className="home-hero-meta">
              <BrandAccountLink />
              <span className="home-version">{APP_VERSION_LABEL}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-now-card">
        <div className="home-now-head">
          <h2>現在のわたし</h2>
          {todayLabel ? <span className="home-now-date">（{todayLabel} 現在）</span> : null}
        </div>
        <div className="home-now-grid">
          {summaryItems.map((item) => (
            <Link key={item.label} href={item.href} className="home-stat-tile">
              <span className="home-stat-label">{item.label}</span>
              <span className={`home-stat-value ${item.compactValue ? "compact" : ""}`}>
                {item.value}
                {item.unit ? <small>{item.unit}</small> : null}
              </span>
              <span className="home-stat-note">{item.note}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-feature-grid">
        {featureItems.map((item) => (
          <Link key={item.href} href={item.href} className={`home-feature-card tone-${item.tone}`}>
            <span className="home-feature-icon" aria-hidden="true">
              <UiIcon name={item.icon} className="home-feature-glyph" />
            </span>
            <span className="home-feature-body">
              <strong>{item.title}</strong>
              <span className="home-feature-desc">
                {item.description.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </span>
            <UiIcon name="chevron-right" className="home-feature-arrow" aria-hidden="true" />
          </Link>
        ))}
      </section>

      <section className="home-section">
        <h2 className="home-section-title">最近のメモ</h2>
        <div className="home-memo-card">
          {recentNotes.length === 0 ? (
            <div className="home-memo-empty">
              <p className="home-memo-title">まだAI相談メモはありません</p>
              <p className="home-memo-summary">相談を追加すると、ここに最近のメモが表示されます。</p>
            </div>
          ) : (
            recentNotes.map((note) => (
              <article key={note.id} className="home-memo-row">
                <span className="home-memo-icon" aria-hidden="true">
                  <UiIcon name="ai" className="home-memo-glyph" />
                </span>
                <div className="home-memo-body">
                  <div className="home-memo-topline">
                    <p className="home-memo-title">{note.title}</p>
                    <span className="home-memo-date">{formatMonthDay(note.consultedAt)}</span>
                  </div>
                  <p className="home-memo-summary">{note.summary}</p>
                </div>
              </article>
            ))
          )}
          <Link href="/ai-notes" className="home-memo-more">
            <span>すべてのAI相談メモをみる</span>
            <UiIcon name="chevron-right" className="home-memo-more-icon" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="home-section home-section-sub">
        <details className="home-fold">
          <summary className="home-fold-summary">
            <span>最近更新した情報</span>
            <UiIcon name="chevron-right" className="home-fold-icon" aria-hidden="true" />
          </summary>
          <div className="home-fold-body">
            {recentItems.map((item) => (
              <article key={item.title} className="home-update-row">
                <p className="home-update-date">{item.date}</p>
                <p className="home-update-title">{item.title}</p>
                <p className="home-update-text">{item.description}</p>
              </article>
            ))}
          </div>
        </details>

        <details
          className="home-fold"
          onToggle={(event) => {
            if (event.currentTarget.open) {
              refreshAutosaveHistory();
            }
          }}
        >
          <summary className="home-fold-summary">
            <span>大切なデータをバックアップ</span>
            <UiIcon name="chevron-right" className="home-fold-icon" aria-hidden="true" />
          </summary>
          <div className="home-fold-body">
            <p className="item-title small">自動保存の履歴</p>
            <p className="home-fold-text">
              最近の状態を、この端末に3件まで自動で保存しています。
            </p>
            <p className="home-fold-text">
              誤って消したときや、少し前の内容に戻したいときに、この端末の中だけで使えます。
            </p>

            {autosaveHistory.length === 0 ? (
              <p className="home-fold-text">まだ自動保存の履歴はありません。データを保存すると、ここに残ります。</p>
            ) : (
              <div className="autosave-list">
                {autosaveHistory.map((entry, index) => (
                  <div key={entry.id} className="autosave-row">
                    <div className="autosave-row-copy">
                      <p className="autosave-row-time">
                        {formatAutosaveDateTime(entry.savedAt)}
                        {index === 0 ? <span className="term-latest-badge">最新</span> : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="action-button autosave-restore-button"
                      onClick={() => handleAutosaveRestore(entry)}
                    >
                      この状態に戻す
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="item-title small">バックアップ</p>
            <p className="home-fold-text">
              機種変更、別の端末、家族への受け渡しには、ファイルとして保存するバックアップを使います。
            </p>
            <p className="home-fold-text">
              バックアップは自分の端末にファイルとして残ります。SHINROMiiのサーバーには保存されません。
            </p>

            <div className="action-row">
              <button type="button" className="action-button primary" onClick={handleBackupExport}>
                <UiIcon name="download" className="action-icon" />
                バックアップを保存
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => restoreInputRef.current?.click()}
              >
                <UiIcon name="upload" className="action-icon" />
                バックアップから復元
              </button>
            </div>

            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                void handleBackupImport(event.target.files);
                event.target.value = "";
              }}
            />

            <p className="home-fold-text">
              復元すると、今の内容はバックアップの内容に置き換わります。今のデータを残したい場合は、先にバックアップを保存してください。添付ファイル本体はバックアップに含まれません。
            </p>

            {dataManagementMessage ? (
              <div className="info-strip">
                <p className="item-title small">データの状況</p>
                <p>{dataManagementMessage}</p>
              </div>
            ) : null}
          </div>
        </details>
      </section>
    </div>
  );
}
