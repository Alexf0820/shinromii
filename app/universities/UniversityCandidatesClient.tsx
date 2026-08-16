"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
import { UiIcon } from "@/components/UiIcon";
import { universities as initialCandidates } from "@/data/mockData";
import type { UniversityCandidate } from "@/data/mockData";
import {
  loadShinromiiStorage,
  loadUniversitySortOrder,
  saveUniversityCandidates,
  saveUniversitySortOrder,
} from "@/lib/shinromii-storage";
import type { UniversitySortOrder } from "@/lib/shinromii-storage";

const evaluationOptions = ["かなり高い", "高い", "検討中", "低い"] as const;

type CandidateFormState = {
  university: string;
  faculty: string;
  department: string;
  url: string;
  interest: number | null;
  studentScore: UniversityCandidate["studentScore"];
  familyScore: UniversityCandidate["familyScore"];
  studentView: string;
  familyView: string;
  reason: string;
  futureNote: string;
};

function createCandidateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `candidate-${Date.now()}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(): CandidateFormState {
  return {
    university: "",
    faculty: "",
    department: "",
    url: "",
    interest: 3,
    studentScore: "検討中",
    familyScore: "検討中",
    studentView: "",
    familyView: "",
    reason: "",
    futureNote: "",
  };
}

function formFromCandidate(candidate: UniversityCandidate): CandidateFormState {
  return {
    university: candidate.university,
    faculty: candidate.faculty,
    department: candidate.department,
    url: candidate.url,
    interest: candidate.interest,
    studentScore: candidate.studentScore,
    familyScore: candidate.familyScore,
    studentView: candidate.studentView,
    familyView: candidate.familyView,
    reason: candidate.reason,
    futureNote: candidate.futureNote,
  };
}

function shorten(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function renderStars(score: number) {
  return (
    <span className="stars" aria-label={`気になる度 ${score} / 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} className={value <= score ? "" : "star-muted"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function UniversityCandidatesClient() {
  const [candidates, setCandidates] = useState<UniversityCandidate[]>(initialCandidates);
  const [selectedId, setSelectedId] = useState<string | null>(initialCandidates[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sortOrder, setSortOrder] = useState<UniversitySortOrder>("interest");
  const [form, setForm] = useState<CandidateFormState>(createEmptyForm());
  const [pendingEditScrollId, setPendingEditScrollId] = useState<string | null>(null);
  const editRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const storage = loadShinromiiStorage();
    setCandidates(storage.universityCandidates);
    setSelectedId(storage.universityCandidates[0]?.id ?? null);
    setSortOrder(loadUniversitySortOrder());
  }, []);

  const sortedCandidates = useMemo(() => {
    const next = [...candidates];

    if (sortOrder === "newest") {
      return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    if (sortOrder === "oldest") {
      return next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    if (sortOrder === "name") {
      return next.sort((a, b) => a.university.localeCompare(b.university, "ja"));
    }

    return next.sort((a, b) => {
      if (b.interest !== a.interest) {
        return b.interest - a.interest;
      }

      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [candidates, sortOrder]);

  const selectedCandidate = useMemo(
    () => candidates.find((item) => item.id === selectedId) ?? null,
    [candidates, selectedId],
  );

  function updateForm<K extends keyof CandidateFormState>(key: K, value: CandidateFormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreate() {
    setIsCreating(true);
    setEditingId(null);
    setPendingEditScrollId(null);
    setForm(createEmptyForm());
  }

  function openEdit(candidate: UniversityCandidate) {
    setIsCreating(false);
    setEditingId(candidate.id);
    setSelectedId(null);
    setPendingEditScrollId(candidate.id);
    setForm(formFromCandidate(candidate));
  }

  function closeEditor() {
    setIsCreating(false);
    setEditingId(null);
    setPendingEditScrollId(null);
    setForm(createEmptyForm());
  }

  function handleSave() {
    if (!form.university.trim() || !form.faculty.trim()) {
      window.alert("大学名と学部名は入力してください。");
      return;
    }

    const nextCandidate: UniversityCandidate = {
      id: editingId ?? createCandidateId(),
      createdAt: editingId
        ? candidates.find((item) => item.id === editingId)?.createdAt ?? todayString()
        : todayString(),
      university: form.university.trim(),
      faculty: form.faculty.trim(),
      department: form.department.trim(),
      url: form.url.trim(),
      interest: form.interest ?? 3,
      studentScore: form.studentScore,
      familyScore: form.familyScore,
      studentView: form.studentView.trim(),
      familyView: form.familyView.trim(),
      reason: form.reason.trim(),
      futureNote: form.futureNote.trim(),
    };

    const nextCandidates = editingId
      ? candidates.map((item) => (item.id === editingId ? nextCandidate : item))
      : [nextCandidate, ...candidates];

    setCandidates(nextCandidates);
    setSelectedId(nextCandidate.id);
    saveUniversityCandidates(nextCandidates);
    closeEditor();
  }

  function handleDelete(candidate: UniversityCandidate) {
    const confirmed = window.confirm(`「${candidate.university} ${candidate.faculty}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    const nextCandidates = candidates.filter((item) => item.id !== candidate.id);
    setCandidates(nextCandidates);
    saveUniversityCandidates(nextCandidates);

    if (selectedId === candidate.id) {
      setSelectedId(nextCandidates[0]?.id ?? null);
    }

    if (editingId === candidate.id) {
      closeEditor();
    }
  }

  function handleSortChange(nextSortOrder: UniversitySortOrder) {
    setSortOrder(nextSortOrder);
    saveUniversitySortOrder(nextSortOrder);
  }

  function toggleDetail(id: string) {
    if (editingId) {
      closeEditor();
    }

    setSelectedId((current) => (current === id ? null : id));
  }

  function renderCandidateEditor(title: string, description: string, editorId?: string) {
    return (
      <section
        ref={(node) => {
          if (editorId) {
            editRefs.current[editorId] = node;
          }
        }}
        className="panel inline-detail-card inline-editor-card"
      >
        <SectionHeader title={title} description={description} />

        <div className="form-stack">
          <div className="field-grid">
            <label className="field-block">
              <span className="field-label">大学名</span>
              <input
                className="text-input"
                type="text"
                value={form.university}
                onChange={(event) => updateForm("university", event.target.value)}
              />
            </label>

            <label className="field-block">
              <span className="field-label">学部名</span>
              <input
                className="text-input"
                type="text"
                value={form.faculty}
                onChange={(event) => updateForm("faculty", event.target.value)}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field-block">
              <span className="field-label">学科名（任意）</span>
              <input
                className="text-input"
                type="text"
                value={form.department}
                onChange={(event) => updateForm("department", event.target.value)}
              />
            </label>

            <label className="field-block">
              <span className="field-label">大学・学部URL（任意）</span>
              <input
                className="text-input"
                type="url"
                value={form.url}
                onChange={(event) => updateForm("url", event.target.value)}
              />
            </label>
          </div>

          <ScoreSelector
            label="気になる度"
            value={form.interest}
            onChange={(value) => updateForm("interest", value)}
          />

          <div className="field-grid">
            <label className="field-block">
              <span className="field-label">本人評価</span>
              <select
                className="text-input"
                value={form.studentScore}
                onChange={(event) =>
                  updateForm("studentScore", event.target.value as UniversityCandidate["studentScore"])
                }
              >
                {evaluationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span className="field-label">家族評価</span>
              <select
                className="text-input"
                value={form.familyScore}
                onChange={(event) =>
                  updateForm("familyScore", event.target.value as UniversityCandidate["familyScore"])
                }
              >
                {evaluationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field-block">
            <span className="field-label">本人メモ</span>
            <textarea
              className="text-area"
              rows={4}
              value={form.studentView}
              onChange={(event) => updateForm("studentView", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">家族メモ</span>
            <textarea
              className="text-area"
              rows={4}
              value={form.familyView}
              onChange={(event) => updateForm("familyView", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">志望理由・気になる理由（任意）</span>
            <textarea
              className="text-area"
              rows={4}
              value={form.reason}
              onChange={(event) => updateForm("reason", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">将来の仕事・進路メモ（任意）</span>
            <textarea
              className="text-area"
              rows={4}
              value={form.futureNote}
              onChange={(event) => updateForm("futureNote", event.target.value)}
            />
          </label>

          <div className="action-row">
            <button type="button" className="action-button primary" onClick={handleSave}>
              保存する
            </button>
            <button type="button" className="action-button" onClick={closeEditor}>
              キャンセル
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderCandidateDetail(candidate: UniversityCandidate) {
    return (
      <section className="detail-card inline-detail-card">
        <div className="detail-section-header">
          <div>
            <p className="eyebrow">候補詳細</p>
            <p className="item-title">{candidate.university}</p>
            <p className="item-subtitle">
              {candidate.faculty}
              {candidate.department ? ` / ${candidate.department}` : ""}
            </p>
          </div>
          <div className="score-display">
            {renderStars(candidate.interest)}
            <span className="item-subtitle">{candidate.interest.toFixed(1)}</span>
          </div>
        </div>

        <div className="detail-section-list top-gap">
          <section className="detail-section">
            <p className="feedback-label">基本情報</p>
            <div className="detail-entry top-gap">
              <span className="detail-entry-label">大学名</span>
              <span className="detail-entry-value">{candidate.university}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">学部・学科</span>
              <span className="detail-entry-value">
                {candidate.faculty}
                {candidate.department ? ` / ${candidate.department}` : ""}
              </span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">URL</span>
              <span className="detail-entry-value">
                {candidate.url ? (
                  <a className="text-link inline-link" href={candidate.url}>
                    {candidate.url}
                  </a>
                ) : (
                  "未入力"
                )}
              </span>
            </div>
          </section>

          <section className="detail-section">
            <p className="feedback-label">評価</p>
            <div className="detail-entry top-gap">
              <span className="detail-entry-label">気になる度</span>
              <span className="detail-entry-value">{renderStars(candidate.interest)}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">本人評価</span>
              <span className="detail-entry-value">{candidate.studentScore}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">家族評価</span>
              <span className="detail-entry-value">{candidate.familyScore}</span>
            </div>
          </section>

          <section className="detail-section">
            <p className="feedback-label">メモ</p>
            <div className="detail-entry top-gap">
              <span className="detail-entry-label">本人メモ</span>
              <span className="detail-entry-value preserve-lines">
                {candidate.studentView || "まだ入力されていません"}
              </span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">家族メモ</span>
              <span className="detail-entry-value preserve-lines">
                {candidate.familyView || "まだ入力されていません"}
              </span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">志望理由</span>
              <span className="detail-entry-value preserve-lines">
                {candidate.reason || "まだ入力されていません"}
              </span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">将来メモ</span>
              <span className="detail-entry-value preserve-lines">
                {candidate.futureNote || "まだ入力されていません"}
              </span>
            </div>
          </section>
        </div>
      </section>
    );
  }

  useEffect(() => {
    if (!pendingEditScrollId || pendingEditScrollId !== editingId) {
      return;
    }

    const element = editRefs.current[pendingEditScrollId];

    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingEditScrollId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [editingId, pendingEditScrollId]);

  return (
    <div className="page-stack">
      <section className="page-hero tone-university">
        <div className="page-hero-copy">
          <p className="eyebrow">大学・学部候補</p>
          <h2 className="hero-title">候補を比べて、気持ちを整理する。</h2>
          <p className="hero-description">
            気になる度、本人評価、家族評価をカード単位で見渡しやすくまとめます。
          </p>
          <div className="hero-stats-inline">
            <span className="hero-stat-chip">
              <strong>{candidates.length}校</strong>
              <span className="item-subtitle">保存済み</span>
            </span>
            <span className="hero-stat-chip">
              <strong>{selectedCandidate ? selectedCandidate.university : "未選択"}</strong>
              <span className="item-subtitle">現在の詳細</span>
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="row-between gap-sm align-start">
          <div className="compare-header no-margin">
            <span className="soft-pill">localStorage 保存</span>
            <p className="muted-text">
              候補の追加、詳細確認、編集、削除、並び替えまでできます。
            </p>
          </div>
          <button type="button" className="action-button primary" onClick={openCreate}>
            <UiIcon name="plus" className="action-icon" />
            候補を追加
          </button>
        </div>
      </section>

      {isCreating
        ? renderCandidateEditor("候補を追加", "実際の進路検討で見返しやすい内容だけを入力")
        : null}

      <section className="panel">
        <SectionHeader title="候補一覧" description="比較しやすい順に並べ替えながら見返せます" />
        <div className="sort-bar">
          <label className="sort-control">
            <span className="field-label">並び順</span>
            <select
              className="text-input"
              value={sortOrder}
              onChange={(event) => handleSortChange(event.target.value as UniversitySortOrder)}
            >
              <option value="interest">気になる度が高い順</option>
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="name">大学名順</option>
            </select>
          </label>
        </div>

        <div className="list-stack">
          {sortedCandidates.map((item) => (
            <div key={item.id} className="detail-stack">
              <article
                className={`candidate-card tone-university ${selectedId === item.id ? "selected-card" : ""}`}
              >
                <div className="candidate-topline">
                  <div className="candidate-main">
                    <span className="candidate-icon-badge">
                      <UiIcon name="university" className="list-item-icon" />
                    </span>
                    <div className="candidate-summary">
                      <p className="item-title">{item.university}</p>
                      <p className="item-subtitle">
                        {item.faculty}
                        {item.department ? ` / ${item.department}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="heart-shell" aria-hidden="true">
                    ♡
                  </span>
                </div>

                <div className="score-display">
                  {renderStars(item.interest)}
                  <span className="item-subtitle">{item.interest.toFixed(1)}</span>
                </div>

                <div className="badge-row">
                  <span className="pill-person">本人 {item.studentScore}</span>
                  <span className="pill-family">家族 {item.familyScore}</span>
                  <span className="pill-updated">最終更新 {item.createdAt.replaceAll("-", "/")}</span>
                </div>

                <div className="note-card">
                  <p className="feedback-label">本人メモ</p>
                  <p>{item.studentView ? shorten(item.studentView, 88) : "まだ入力されていません"}</p>
                </div>

                <div className="list-actions">
                  {item.url ? (
                    <a className="card-action subtle" href={item.url}>
                      <UiIcon name="link" className="action-icon" />
                      大学ページを見る
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="card-action subtle"
                    onClick={() => toggleDetail(item.id)}
                  >
                    <UiIcon name="detail" className="action-icon" />
                    {selectedId === item.id ? "詳細を閉じる" : "詳細"}
                  </button>
                  <button
                    type="button"
                    className="card-action subtle"
                    onClick={() => (editingId === item.id ? closeEditor() : openEdit(item))}
                  >
                    <UiIcon name="edit" className="action-icon" />
                    {editingId === item.id ? "編集を閉じる" : "編集"}
                  </button>
                  <button type="button" className="card-action danger" onClick={() => handleDelete(item)}>
                    <UiIcon name="delete" className="action-icon" />
                    削除
                  </button>
                </div>
              </article>

              {selectedId === item.id ? renderCandidateDetail(item) : null}
              {editingId === item.id
                ? renderCandidateEditor(
                    `${item.university}を編集`,
                    "実際の進路検討で見返しやすい内容だけを入力",
                    item.id,
                  )
                : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
