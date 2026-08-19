"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CardActionBar } from "@/components/CardActionBar";
import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
import { UiIcon } from "@/components/UiIcon";
import { UniversitySearchPanel } from "@/components/universities/UniversitySearchPanel";
import { universities as initialCandidates } from "@/data/mockData";
import type { UniversityCandidate } from "@/data/mockData";
import { isSameUniversityFaculty, normalizeUniversityCandidate } from "@/lib/university-candidate";
import {
  findUniversityMasterById,
  universityMaster,
  type UniversityMaster,
} from "@/lib/university-master";
import {
  loadShinromiiStorage,
  loadUniversitySortOrder,
  saveUniversityCandidates,
  saveUniversitySortOrder,
} from "@/lib/shinromii-storage";
import type { UniversitySortOrder } from "@/lib/shinromii-storage";

function handleCardKeyActivate(event: KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

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
  universityMasterId?: string;
  facultyMasterId?: string;
  masterCheckedAt?: string;
  masterAcademicYear?: string;
};

type CreateStep = "search" | "faculties" | "form";

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
    universityMasterId: candidate.universityMasterId,
    facultyMasterId: candidate.facultyMasterId,
    masterCheckedAt: candidate.masterCheckedAt,
    masterAcademicYear: candidate.masterAcademicYear,
  };
}

/** Copy forms are keyed apart from edit forms so both can share editRefs. */
function copyEditorKey(candidateId: string) {
  return `copy-${candidateId}`;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("search");
  const [sortOrder, setSortOrder] = useState<UniversitySortOrder>("interest");
  const [form, setForm] = useState<CandidateFormState>(createEmptyForm());
  const [pendingEditScrollId, setPendingEditScrollId] = useState<string | null>(null);
  const editRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const storage = loadShinromiiStorage();
    setCandidates(storage.universityCandidates);
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

  function updateForm<K extends keyof CandidateFormState>(key: K, value: CandidateFormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreate() {
    setIsCreating(true);
    setCreateStep("search");
    setEditingId(null);
    setCopyingId(null);
    setPendingEditScrollId(null);
    setForm(createEmptyForm());
  }

  function openManualCreate(universityName = "", master?: UniversityMaster | null) {
    setIsCreating(true);
    setCreateStep("form");
    setEditingId(null);
    setCopyingId(null);
    setPendingEditScrollId(null);
    setForm({
      ...createEmptyForm(),
      university: universityName,
      universityMasterId: master?.id,
      masterCheckedAt: master ? universityMaster.checkedAt : undefined,
      masterAcademicYear: master ? universityMaster.academicYear : undefined,
    });
  }

  function openEdit(candidate: UniversityCandidate) {
    setIsCreating(false);
    setCreateStep("form");
    setEditingId(candidate.id);
    setCopyingId(null);
    setSelectedId(null);
    setPendingEditScrollId(candidate.id);
    setForm(formFromCandidate(candidate));
  }

  /** Prefills the add form from an existing candidate; nothing is saved yet. */
  function openCopy(candidate: UniversityCandidate) {
    const copied = formFromCandidate(candidate);
    setIsCreating(false);
    setCreateStep("form");
    setEditingId(null);
    setCopyingId(candidate.id);
    setSelectedId(null);
    setPendingEditScrollId(copyEditorKey(candidate.id));
    setForm({
      ...copied,
      universityMasterId: undefined,
      facultyMasterId: undefined,
      masterCheckedAt: undefined,
      masterAcademicYear: undefined,
    });
  }

  function closeEditor() {
    setIsCreating(false);
    setCreateStep("search");
    setEditingId(null);
    setCopyingId(null);
    setPendingEditScrollId(null);
    setForm(createEmptyForm());
  }

  function persistCandidate(nextCandidate: UniversityCandidate, replaceId?: string) {
    const duplicate = candidates.some(
      (item) => item.id !== replaceId && isSameUniversityFaculty(item, nextCandidate),
    );

    if (duplicate) {
      window.alert("同じ大学・学部はすでに候補にあります。");
      return false;
    }

    const nextCandidates = replaceId
      ? candidates.map((item) => (item.id === replaceId ? nextCandidate : item))
      : [nextCandidate, ...candidates];

    setCandidates(nextCandidates);
    setSelectedId(nextCandidate.id);
    saveUniversityCandidates(nextCandidates);
    return true;
  }

  function handleSave() {
    if (!form.university.trim()) {
      window.alert("大学名を入力してください。");
      return;
    }

    const existing = editingId ? candidates.find((item) => item.id === editingId) : undefined;
    const universityName = form.university.trim();
    const facultyName = form.faculty.trim();
    const namesUnchanged =
      existing && existing.university === universityName && existing.faculty === facultyName;
    const masterUniversity = form.universityMasterId
      ? findUniversityMasterById(form.universityMasterId)
      : null;
    const universityMasterId = namesUnchanged
      ? existing?.universityMasterId
      : masterUniversity && masterUniversity.name === universityName
        ? masterUniversity.id
        : undefined;
    const facultyMasterId = namesUnchanged
      ? existing?.facultyMasterId
      : universityMasterId &&
          masterUniversity?.faculties.some(
            (faculty) => faculty.id === form.facultyMasterId && faculty.name === facultyName,
          )
        ? form.facultyMasterId
        : undefined;

    const nextCandidate = normalizeUniversityCandidate({
      id: editingId ?? createCandidateId(),
      createdAt: existing?.createdAt ?? todayString(),
      university: universityName,
      faculty: facultyName,
      department: form.department.trim(),
      url: form.url.trim(),
      interest: form.interest ?? 3,
      studentScore: form.studentScore,
      familyScore: form.familyScore,
      studentView: form.studentView.trim(),
      familyView: form.familyView.trim(),
      reason: form.reason.trim(),
      futureNote: form.futureNote.trim(),
      universityMasterId,
      facultyMasterId,
      masterCheckedAt: universityMasterId
        ? namesUnchanged
          ? existing?.masterCheckedAt
          : universityMaster.checkedAt
        : undefined,
      masterAcademicYear: universityMasterId
        ? namesUnchanged
          ? existing?.masterAcademicYear
          : universityMaster.academicYear
        : undefined,
    });

    if (!persistCandidate(nextCandidate, editingId ?? undefined)) {
      return;
    }

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
      setSelectedId(null);
    }

    if (editingId === candidate.id || copyingId === candidate.id) {
      closeEditor();
    }
  }

  function handleSortChange(nextSortOrder: UniversitySortOrder) {
    setSortOrder(nextSortOrder);
    saveUniversitySortOrder(nextSortOrder);
  }

  function toggleDetail(id: string) {
    if (editingId || copyingId) {
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
              <span className="field-label">学部名（任意）</span>
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
    const facultyLabel = [candidate.faculty, candidate.department].filter(Boolean).join(" / ");
    const notes = [
      { label: "本人メモ", value: candidate.studentView.trim() },
      { label: "家族メモ", value: candidate.familyView.trim() },
      { label: "志望理由", value: candidate.reason.trim() },
      { label: "将来メモ", value: candidate.futureNote.trim() },
    ].filter((item) => item.value);

    return (
      <section className="uni-detail-card inline-detail-card">
        <div className="uni-detail-head">
          <div className="uni-detail-heading">
            <p className="uni-detail-eyebrow">候補詳細</p>
            <p className="uni-detail-name">{candidate.university}</p>
            {facultyLabel ? <p className="uni-detail-faculty">{facultyLabel}</p> : null}
          </div>
          <div className="uni-detail-score">
            {renderStars(candidate.interest)}
            <span className="uni-detail-score-value">{candidate.interest.toFixed(1)}</span>
          </div>
        </div>

        <div className="uni-detail-sections">
          {candidate.url ? (
            <section className="uni-detail-section">
              <p className="uni-detail-section-title">基本情報</p>
              <div className="review-note">
                <span className="review-note-label">URL</span>
                <a className="uni-detail-link" href={candidate.url}>
                  {candidate.url}
                </a>
              </div>
            </section>
          ) : null}

          <section className="uni-detail-section">
            <p className="uni-detail-section-title">評価</p>
            <div className="uni-interest-row">
              <span className="uni-eval-card-label">気になる度</span>
              <span className="uni-detail-score">
                {renderStars(candidate.interest)}
                <span className="uni-detail-score-value">{candidate.interest.toFixed(1)}</span>
              </span>
            </div>
            <div className="uni-eval-grid">
              <div className="uni-eval-card">
                <span className="uni-eval-card-label">本人</span>
                <span className="uni-eval-card-value">{candidate.studentScore}</span>
              </div>
              <div className="uni-eval-card">
                <span className="uni-eval-card-label">家族</span>
                <span className="uni-eval-card-value">{candidate.familyScore}</span>
              </div>
            </div>
          </section>

          {notes.length > 0 ? (
            <section className="uni-detail-section">
              <p className="uni-detail-section-title">考えていること</p>
              {notes.map((item) => (
                <div key={item.label} className="review-note">
                  <span className="review-note-label">{item.label}</span>
                  <p className="review-note-body preserve-lines">{item.value}</p>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </section>
    );
  }

  const openEditorKey = editingId ?? (copyingId ? copyEditorKey(copyingId) : null);

  useEffect(() => {
    if (!pendingEditScrollId || pendingEditScrollId !== openEditorKey) {
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
  }, [openEditorKey, pendingEditScrollId]);

  return (
    <div className="uni-page">
      <section className="list-section">
        <div className="list-section-head">
          <div className="list-section-copy">
            <h2 className="list-section-title">大学・学部候補</h2>
            <p className="list-section-note">{candidates.length}校を保存中</p>
          </div>
          <button
            type="button"
            className="list-add-button"
            onClick={openCreate}
            aria-label="候補を追加"
          >
            <UiIcon name="plus" className="list-add-icon" />
          </button>
        </div>

        <label className="uni-sort">
          <span className="uni-sort-label">並び順</span>
          <select
            className="uni-sort-select"
            value={sortOrder}
            onChange={(event) => handleSortChange(event.target.value as UniversitySortOrder)}
          >
            <option value="interest">気になる度が高い順</option>
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="name">大学名順</option>
          </select>
        </label>

        {isCreating && createStep === "form"
          ? renderCandidateEditor("候補を追加", "実際の進路検討で見返しやすい内容だけを入力")
          : null}
        {isCreating && createStep !== "form" ? (
          <UniversitySearchPanel
            onRegister={(candidate) => {
              if (!persistCandidate(candidate)) {
                return false;
              }

              closeEditor();
              return true;
            }}
            onCancel={closeEditor}
            onManual={(universityName, master) => openManualCreate(universityName, master)}
          />
        ) : null}

        <div className="uni-list">
          {sortedCandidates.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">まだ大学・学部候補はありません</p>
              <p className="muted-text">気になる大学から気軽に登録できます。</p>
            </div>
          ) : (
            sortedCandidates.map((item) => (
              <div key={item.id} className="detail-stack uni-stack">
                <article
                  className={`uni-card ${selectedId === item.id || editingId === item.id ? "is-open" : ""}`}
                >
                  <div
                    className="card-tap-area"
                    role="button"
                    tabIndex={0}
                    aria-expanded={selectedId === item.id}
                    aria-label={`${item.university}の詳細`}
                    onClick={() => toggleDetail(item.id)}
                    onKeyDown={(event) => handleCardKeyActivate(event, () => toggleDetail(item.id))}
                  >
                    <div className="uni-card-head">
                      <span className="uni-card-icon">
                        <UiIcon name="university" className="uni-card-icon-svg" />
                      </span>
                      <div className="uni-card-copy">
                        <p className="uni-card-name">{item.university}</p>
                        <p className="uni-card-faculty">
                          {item.faculty.trim() ? item.faculty : "まだ決めていない"}
                          {item.department ? ` / ${item.department}` : ""}
                        </p>
                      </div>
                      <span className="heart-shell" aria-hidden="true">
                        ♡
                      </span>
                    </div>

                    <div className="uni-card-score">
                      {renderStars(item.interest)}
                      <span className="uni-card-score-value">{item.interest.toFixed(1)}</span>
                    </div>

                    <div className="uni-card-badges">
                      <span className="pill-person">本人 {item.studentScore}</span>
                      <span className="pill-family">家族 {item.familyScore}</span>
                      <span className="pill-updated">
                        最終更新 {item.createdAt.replaceAll("-", "/")}
                      </span>
                    </div>

                    <p className="uni-card-memo">
                      <span className="uni-card-memo-label">本人メモ</span>
                      {item.studentView ? shorten(item.studentView, 88) : "まだ入力されていません"}
                    </p>
                  </div>

                  {item.url ? (
                    <a className="uni-card-link" href={item.url} onClick={(event) => event.stopPropagation()}>
                      <UiIcon name="link" className="subject-action-icon" />
                      大学ページを見る
                    </a>
                  ) : null}

                  <CardActionBar
                    actions={[
                      {
                        icon: "detail",
                        label: selectedId === item.id ? "閉じる" : "詳細",
                        onClick: () => toggleDetail(item.id),
                      },
                      {
                        icon: "edit",
                        label: editingId === item.id ? "閉じる" : "編集",
                        onClick: () => (editingId === item.id ? closeEditor() : openEdit(item)),
                      },
                      {
                        icon: "copy",
                        label: copyingId === item.id ? "閉じる" : "コピー",
                        onClick: () => (copyingId === item.id ? closeEditor() : openCopy(item)),
                      },
                      {
                        icon: "delete",
                        label: "削除",
                        onClick: () => handleDelete(item),
                        variant: "danger",
                      },
                    ]}
                  />
                </article>

                {selectedId === item.id ? renderCandidateDetail(item) : null}
                {editingId === item.id
                  ? renderCandidateEditor(
                      `${item.university}を編集`,
                      "実際の進路検討で見返しやすい内容だけを入力",
                      item.id,
                    )
                  : null}
                {copyingId === item.id
                  ? renderCandidateEditor(
                      `${item.university}をコピーして追加`,
                      "学部・学科などを変更して保存すると、新しい候補として追加されます",
                      copyEditorKey(item.id),
                    )
                  : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
