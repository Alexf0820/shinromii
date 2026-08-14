"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
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

export function UniversityCandidatesClient() {
  const [candidates, setCandidates] = useState<UniversityCandidate[]>(initialCandidates);
  const [selectedId, setSelectedId] = useState<string | null>(initialCandidates[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sortOrder, setSortOrder] = useState<UniversitySortOrder>("interest");
  const [form, setForm] = useState<CandidateFormState>(createEmptyForm());

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
    setForm(createEmptyForm());
  }

  function openEdit(candidate: UniversityCandidate) {
    setIsCreating(false);
    setEditingId(candidate.id);
    setSelectedId(candidate.id);
    setForm(formFromCandidate(candidate));
  }

  function closeEditor() {
    setIsCreating(false);
    setEditingId(null);
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

  return (
    <div className="page-stack">
      <SectionHeader
        title="大学・学部候補"
        description="比較しながら、本人と家族の考えを並べて見られるUI"
      />

      <section className="panel">
        <div className="row-between gap-sm align-start">
          <div className="compare-header no-margin">
            <span className="soft-pill">localStorage 保存</span>
            <p className="muted-text">
              候補の追加、詳細確認、編集、削除、並び替えまでできます。
            </p>
          </div>
          <button type="button" className="action-button primary" onClick={openCreate}>
            候補を追加
          </button>
        </div>
      </section>

      {(isCreating || editingId) && (
        <section className="panel">
          <SectionHeader
            title={isCreating ? "候補を追加" : "候補を編集"}
            description="実際の進路検討で見返しやすい内容だけを入力"
          />

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
      )}

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
          {sortedCandidates.map((item) => {
            const isSelected = selectedId === item.id;
            const shortStudentMemo = item.studentView ? shorten(item.studentView, 80) : "まだ入力されていません";

            return (
              <article key={item.id} className={`candidate-card ${isSelected ? "selected-card" : ""}`}>
                <div className="row-between gap-sm align-start">
                  <div>
                    <p className="item-title">{item.university}</p>
                    <p className="item-subtitle">
                      {item.faculty}
                      {item.department ? ` / ${item.department}` : ""}
                    </p>
                  </div>
                  <span className="rating-badge">★ {item.interest}</span>
                </div>

                <div className="candidate-meta">
                  <span className="soft-pill">本人: {item.studentScore}</span>
                  <span className="soft-pill">家族: {item.familyScore}</span>
                </div>

                <div className="note-card">
                  <p className="feedback-label">本人メモ</p>
                  <p>{shortStudentMemo}</p>
                </div>

                <div className="action-row compact">
                  <button
                    type="button"
                    className="action-button subtle"
                    onClick={() => setSelectedId(isSelected ? null : item.id)}
                  >
                    {isSelected ? "詳細を閉じる" : "詳細を見る"}
                  </button>
                  <button type="button" className="action-button subtle" onClick={() => openEdit(item)}>
                    編集
                  </button>
                  <button type="button" className="action-button subtle danger" onClick={() => handleDelete(item)}>
                    削除
                  </button>
                </div>

                {isSelected && (
                  <div className="detail-stack top-gap">
                    {item.url ? (
                      <div className="note-card">
                        <p className="feedback-label">大学・学部URL</p>
                        <a className="text-link inline-link" href={item.url}>
                          {item.url}
                        </a>
                      </div>
                    ) : null}

                    <div className="feedback-grid">
                      <div className="feedback-card">
                        <p className="feedback-label">本人メモ</p>
                        <p className="preserve-lines">{item.studentView || "まだ入力されていません"}</p>
                      </div>
                      <div className="feedback-card">
                        <p className="feedback-label">家族メモ</p>
                        <p className="preserve-lines">{item.familyView || "まだ入力されていません"}</p>
                      </div>
                    </div>

                    {item.reason ? (
                      <div className="note-card">
                        <p className="feedback-label">志望理由・気になる理由</p>
                        <p className="preserve-lines">{item.reason}</p>
                      </div>
                    ) : null}

                    {item.futureNote ? (
                      <div className="note-card">
                        <p className="feedback-label">将来の仕事・進路メモ</p>
                        <p className="preserve-lines">{item.futureNote}</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
