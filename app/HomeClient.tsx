"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UiIcon } from "@/components/UiIcon";
import { campusUpcoming, recentItems } from "@/data/mockData";
import type { ShinromiiStorage } from "@/lib/shinromii-storage";
import { loadShinromiiStorage } from "@/lib/shinromii-storage";

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
      value: `${campusUpcoming.length}件`,
      note: "今後の予定",
      tone: "campus",
    },
  ];

  return (
    <div className="page-stack home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">SHINROMII Ver.0.5</p>
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
          {summaryItems.map((item) => (
            <article key={item.label} className={`summary-card tone-${item.tone}`}>
              <p className="metric-label">{item.label}</p>
              <p className="stat-value">{item.value}</p>
              <p className="muted-text">{item.note}</p>
            </article>
          ))}
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
