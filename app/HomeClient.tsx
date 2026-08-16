"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { UiIcon } from "@/components/UiIcon";
import { recentItems } from "@/data/mockData";
import {
  formatBackupFileName,
  parseShinromiiBackupJson,
  stringifyShinromiiBackup,
} from "@/lib/shinromii-backup";
import type { ShinromiiStorage } from "@/lib/shinromii-storage";
import { loadShinromiiStorage, saveShinromiiStorage } from "@/lib/shinromii-storage";

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

function createFallbackSummary(): ShinromiiStorage | null {
  return null;
}

const shortcutItems = [
  {
    href: "/universities",
    title: "大学・学部候補",
    description: "気になる大学を比較して整理する",
    icon: "university" as const,
    tone: "university",
  },
  {
    href: "/open-campus",
    title: "オープンキャンパス",
    description: "参加記録や評価を残す",
    icon: "campus" as const,
    tone: "campus",
  },
  {
    href: "/ai-notes",
    title: "AI相談メモ",
    description: "相談内容と答えを見返す",
    icon: "ai" as const,
    tone: "ai",
  },
  {
    href: "/grades",
    title: "成績・資格",
    description: "評定平均と資格をまとめる",
    icon: "grades" as const,
    tone: "grades",
  },
];

export function HomeClient() {
  const [storage, setStorage] = useState<ShinromiiStorage | null>(createFallbackSummary());
  const [dataManagementMessage, setDataManagementMessage] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStorage(loadShinromiiStorage());
  }, []);

  const latestGradeAverage = useMemo(() => {
    if (!storage || storage.gradeRecords.length === 0) {
      return null;
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

    return average(target);
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
      label: "評定平均",
      value: formatAverage(latestGradeAverage),
      note: "最新学期",
      tone: "grades",
    },
    {
      label: "資格・検定",
      value: storage ? `${storage.qualifications.length}件` : "-",
      note: "記録済み",
      tone: "grades",
    },
    {
      label: "大学候補",
      value: storage ? `${storage.universityCandidates.length}校` : "-",
      note: "比較中",
      tone: "university",
    },
    {
      label: "OC参加予定",
      value: storage
        ? `${storage.openCampusEvents.filter((item) => item.status !== "参加済み").length}件`
        : "-",
      note: "今後の予定",
      tone: "campus",
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

    setDataManagementMessage("バックアップJSONを書き出しました。");
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
        "現在のSHINROMIIデータは、選択したバックアップの内容に置き換えられます。よろしいですか？",
      );

      if (!confirmed) {
        setDataManagementMessage("バックアップの読み込みをキャンセルしました。");
        return;
      }

      saveShinromiiStorage(parsed.storage);
      setStorage(parsed.storage);
      setDataManagementMessage("バックアップを読み込み、データを置き換えました。");
      window.alert("バックアップを読み込みました。");
    } catch {
      const message = "バックアップファイルの読み込みに失敗しました。";
      window.alert(message);
      setDataManagementMessage(message);
    }
  }

  return (
    <div className="page-stack home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">SHINROMII Ver.0.53</p>
          <h1>わたしの進路ノート</h1>
          <p className="hero-copy">
            未来の自分に向けて、今のわたしができることを整える。
          </p>
          <span className="hero-mini-badge">UI Ver.2</span>
        </div>
        <div className="home-hero-visual" aria-hidden="true">
          <div className="hero-orb hero-orb-main" />
          <div className="hero-orb hero-orb-sub" />
          <div className="hero-silhouette" />
        </div>
      </section>

      <section className="panel section-panel">
        <SectionTitle title="現在のわたし" detail="今日の進路状況をひと目で確認" />
        <div className="summary-grid">
          {summaryItems.map((item) =>
            item.label === "評定平均" ? (
              <Link key={item.label} href="/grades#grades" className={`summary-card tone-${item.tone}`}>
                <p className="metric-label">{item.label}</p>
                <p className="stat-value">{item.value}</p>
                <p className="muted-text">{item.note}</p>
              </Link>
            ) : (
              <article key={item.label} className={`summary-card tone-${item.tone}`}>
                <p className="metric-label">{item.label}</p>
                <p className="stat-value">{item.value}</p>
                <p className="muted-text">{item.note}</p>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="shortcut-grid">
        {shortcutItems.map((item) => (
          <Link key={item.href} href={item.href} className={`shortcut-card tone-${item.tone}`}>
            <span className="shortcut-icon-wrap">
              <UiIcon name={item.icon} className="shortcut-icon" />
            </span>
            <span className="shortcut-copy">
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <UiIcon name="chevron-right" className="shortcut-arrow" />
          </Link>
        ))}
      </section>

      <section className="panel section-panel">
        <SectionTitle title="最近のメモ" detail="直近のAI相談メモから見返す" />
        <div className="list-stack">
          {recentNotes.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">まだAI相談メモはありません</p>
              <p className="muted-text">相談を追加するとここに最近のメモが表示されます。</p>
            </div>
          ) : (
            recentNotes.map((note) => (
              <article key={note.id} className="list-card compact-card">
                <div className="row-between gap-sm align-start">
                  <div>
                    <p className="item-title small">{note.title}</p>
                    <p className="item-subtitle">
                      {note.provider} / {note.consultedAt.replaceAll("-", ".")}
                    </p>
                  </div>
                  <span className="soft-pill">参考度 {note.helpful}</span>
                </div>
                <p className="muted-text top-gap">{note.summary}</p>
              </article>
            ))
          )}
        </div>
        <Link href="/ai-notes" className="text-link inline-link">
          すべてのAI相談メモを見る
          <UiIcon name="chevron-right" className="inline-link-icon" />
        </Link>
      </section>

      <section className="panel section-panel">
        <SectionTitle title="最近更新した情報" detail="追加した内容を整理して表示" />
        <div className="timeline-list">
          {recentItems.map((item) => (
            <article key={item.title} className="timeline-item">
              <p className="timeline-date">{item.date}</p>
              <p className="item-title small">{item.title}</p>
              <p className="muted-text">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-panel">
        <SectionTitle title="データ管理" detail="家族間で使う通常バックアップをJSONで扱う" />
        <div className="editor-card">
          <div className="list-stack">
            <div>
              <p className="item-title small">通常バックアップ</p>
              <p className="muted-text">
                端末内の進路データをJSONで書き出し、別端末で読み込めます。添付ファイル本体は対象外です。
              </p>
            </div>

            <div className="action-row">
              <button type="button" className="action-button primary" onClick={handleBackupExport}>
                <UiIcon name="download" className="action-icon" />
                バックアップを書き出す
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => restoreInputRef.current?.click()}
              >
                <UiIcon name="upload" className="action-icon" />
                バックアップを読み込む
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

            <p className="muted-text">
              読み込みは全置換です。現在のデータを残したい場合は、先に書き出しを行ってください。
            </p>

            {dataManagementMessage ? (
              <div className="info-strip">
                <p className="item-title small">バックアップ状況</p>
                <p>{dataManagementMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="section-header home-section-header">
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
    </div>
  );
}
