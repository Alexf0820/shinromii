"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import { gradeRecords as initialGradeRecords, qualifications as initialQualifications } from "@/data/mockData";
import type {
  GradeRecord,
  GradeSchoolYear,
  GradeTerm,
  QualificationRecord,
  QualificationStatus,
} from "@/data/mockData";
import {
  loadShinromiiStorage,
  saveGradeRecords,
  saveQualifications,
} from "@/lib/shinromii-storage";

const schoolYearOptions: GradeSchoolYear[] = ["高1", "高2", "高3"];
const termOptions: GradeTerm[] = ["1学期", "2学期", "3学期", "学年末"];
const qualificationStatusOptions: QualificationStatus[] = ["取得済み", "受験予定", "結果待ち"];

const schoolYearRank: Record<GradeSchoolYear, number> = {
  高1: 1,
  高2: 2,
  高3: 3,
};

const termRank: Record<GradeTerm, number> = {
  "1学期": 1,
  "2学期": 2,
  "3学期": 3,
  学年末: 4,
};

type GradeFormState = {
  schoolYear: GradeSchoolYear;
  term: GradeTerm;
  subject: string;
  grade: number;
  memo: string;
};

type QualificationFormState = {
  name: string;
  scoreOrLevel: string;
  examDate: string;
  status: QualificationStatus;
  memo: string;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyGradeForm(): GradeFormState {
  return {
    schoolYear: "高1",
    term: "1学期",
    subject: "",
    grade: 3,
    memo: "",
  };
}

function createEmptyQualificationForm(): QualificationFormState {
  return {
    name: "",
    scoreOrLevel: "",
    examDate: todayString(),
    status: "取得済み",
    memo: "",
  };
}

function formFromGradeRecord(record: GradeRecord): GradeFormState {
  return {
    schoolYear: record.schoolYear,
    term: record.term,
    subject: record.subject,
    grade: record.grade,
    memo: record.memo,
  };
}

function formFromQualification(record: QualificationRecord): QualificationFormState {
  return {
    name: record.name,
    scoreOrLevel: record.scoreOrLevel,
    examDate: record.examDate,
    status: record.status,
    memo: record.memo,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverage(value: number | null) {
  return value === null ? "-" : value.toFixed(1);
}

function formatDate(date: string) {
  if (!date) {
    return "日付未設定";
  }

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${year}年${Number(month)}月${Number(day)}日`;
}

function sortGradeRecords(records: GradeRecord[]) {
  return [...records].sort((a, b) => {
    const yearDiff = schoolYearRank[b.schoolYear] - schoolYearRank[a.schoolYear];

    if (yearDiff !== 0) {
      return yearDiff;
    }

    const termDiff = termRank[b.term] - termRank[a.term];

    if (termDiff !== 0) {
      return termDiff;
    }

    if (b.updatedAt !== a.updatedAt) {
      return b.updatedAt.localeCompare(a.updatedAt);
    }

    return a.subject.localeCompare(b.subject, "ja");
  });
}

function sortQualifications(records: QualificationRecord[]) {
  return [...records].sort((a, b) => {
    if (b.examDate !== a.examDate) {
      return b.examDate.localeCompare(a.examDate);
    }

    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function qualificationStatusClass(status: QualificationStatus) {
  if (status === "取得済み") {
    return "review";
  }

  if (status === "受験予定") {
    return "reserved";
  }

  return "considering";
}

export function GradesClient() {
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>(initialGradeRecords);
  const [qualifications, setQualifications] = useState<QualificationRecord[]>(initialQualifications);
  const [gradeEditingId, setGradeEditingId] = useState<string | null>(null);
  const [qualificationEditingId, setQualificationEditingId] = useState<string | null>(null);
  const [isCreatingGrade, setIsCreatingGrade] = useState(false);
  const [isCreatingQualification, setIsCreatingQualification] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeFormState>(createEmptyGradeForm());
  const [qualificationForm, setQualificationForm] = useState<QualificationFormState>(
    createEmptyQualificationForm(),
  );

  useEffect(() => {
    const storage = loadShinromiiStorage();
    setGradeRecords(storage.gradeRecords);
    setQualifications(storage.qualifications);
  }, []);

  const sortedGradeRecords = useMemo(() => sortGradeRecords(gradeRecords), [gradeRecords]);
  const sortedQualifications = useMemo(() => sortQualifications(qualifications), [qualifications]);

  const gradeGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        schoolYear: GradeSchoolYear;
        term: GradeTerm;
        average: number;
        records: GradeRecord[];
      }
    >();

    sortedGradeRecords.forEach((record) => {
      const key = `${record.schoolYear}-${record.term}`;
      const existing = groups.get(key);

      if (existing) {
        existing.records.push(record);
        existing.average = average(existing.records.map((item) => item.grade)) ?? 0;
        return;
      }

      groups.set(key, {
        key,
        schoolYear: record.schoolYear,
        term: record.term,
        average: record.grade,
        records: [record],
      });
    });

    return Array.from(groups.values());
  }, [sortedGradeRecords]);

  const latestGroup = gradeGroups[0] ?? null;
  const latestQualification = sortedQualifications[0] ?? null;

  const summaryCards = useMemo(() => {
    const cards: { label: string; value: string; note: string }[] = [];
    const overallAverage = average(gradeRecords.map((item) => item.grade));

    schoolYearOptions.forEach((schoolYear) => {
      const yearAverage = average(
        gradeRecords.filter((item) => item.schoolYear === schoolYear).map((item) => item.grade),
      );

      if (yearAverage !== null) {
        cards.push({
          label: `${schoolYear}平均`,
          value: formatAverage(yearAverage),
          note: `${schoolYear}の登録科目`,
        });
      }
    });

    cards.push({
      label: "記録済み資格",
      value: `${qualifications.length}件`,
      note: qualifications.length > 0 ? "資格・検定" : "まだ未登録",
    });

    if (overallAverage !== null) {
      cards.push({
        label: "全期間平均",
        value: formatAverage(overallAverage),
        note: `${gradeRecords.length}件から算出`,
      });
    }

    return cards;
  }, [gradeRecords, qualifications.length]);

  function updateGradeForm<K extends keyof GradeFormState>(key: K, value: GradeFormState[K]) {
    setGradeForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateQualificationForm<K extends keyof QualificationFormState>(
    key: K,
    value: QualificationFormState[K],
  ) {
    setQualificationForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateGrade() {
    setIsCreatingGrade(true);
    setGradeEditingId(null);
    setGradeForm(createEmptyGradeForm());
  }

  function openEditGrade(record: GradeRecord) {
    setIsCreatingGrade(false);
    setGradeEditingId(record.id);
    setGradeForm(formFromGradeRecord(record));
  }

  function closeGradeEditor() {
    setIsCreatingGrade(false);
    setGradeEditingId(null);
    setGradeForm(createEmptyGradeForm());
  }

  function handleSaveGrade() {
    if (!gradeForm.subject.trim()) {
      window.alert("科目名を入力してください。");
      return;
    }

    const now = todayString();
    const currentRecord = gradeEditingId
      ? gradeRecords.find((item) => item.id === gradeEditingId) ?? null
      : null;

    const nextRecord: GradeRecord = {
      id: gradeEditingId ?? createId("grade"),
      schoolYear: gradeForm.schoolYear,
      term: gradeForm.term,
      subject: gradeForm.subject.trim(),
      grade: gradeForm.grade,
      memo: gradeForm.memo.trim(),
      createdAt: currentRecord?.createdAt ?? now,
      updatedAt: now,
    };

    const nextRecords = gradeEditingId
      ? gradeRecords.map((item) => (item.id === gradeEditingId ? nextRecord : item))
      : [nextRecord, ...gradeRecords];

    setGradeRecords(nextRecords);
    saveGradeRecords(nextRecords);
    closeGradeEditor();
  }

  function handleDeleteGrade(record: GradeRecord) {
    const confirmed = window.confirm(
      `「${record.schoolYear} ${record.term} ${record.subject}」を削除しますか？`,
    );

    if (!confirmed) {
      return;
    }

    const nextRecords = gradeRecords.filter((item) => item.id !== record.id);
    setGradeRecords(nextRecords);
    saveGradeRecords(nextRecords);

    if (gradeEditingId === record.id) {
      closeGradeEditor();
    }
  }

  function openCreateQualification() {
    setIsCreatingQualification(true);
    setQualificationEditingId(null);
    setQualificationForm(createEmptyQualificationForm());
  }

  function openEditQualification(record: QualificationRecord) {
    setIsCreatingQualification(false);
    setQualificationEditingId(record.id);
    setQualificationForm(formFromQualification(record));
  }

  function closeQualificationEditor() {
    setIsCreatingQualification(false);
    setQualificationEditingId(null);
    setQualificationForm(createEmptyQualificationForm());
  }

  function handleSaveQualification() {
    if (!qualificationForm.name.trim() || !qualificationForm.scoreOrLevel.trim()) {
      window.alert("資格名と級・スコアを入力してください。");
      return;
    }

    if (!qualificationForm.examDate) {
      window.alert("取得日または受験日を入力してください。");
      return;
    }

    const now = todayString();
    const currentRecord = qualificationEditingId
      ? qualifications.find((item) => item.id === qualificationEditingId) ?? null
      : null;

    const nextRecord: QualificationRecord = {
      id: qualificationEditingId ?? createId("qualification"),
      name: qualificationForm.name.trim(),
      scoreOrLevel: qualificationForm.scoreOrLevel.trim(),
      examDate: qualificationForm.examDate,
      status: qualificationForm.status,
      memo: qualificationForm.memo.trim(),
      createdAt: currentRecord?.createdAt ?? now,
      updatedAt: now,
    };

    const nextQualifications = qualificationEditingId
      ? qualifications.map((item) => (item.id === qualificationEditingId ? nextRecord : item))
      : [nextRecord, ...qualifications];

    setQualifications(nextQualifications);
    saveQualifications(nextQualifications);
    closeQualificationEditor();
  }

  function handleDeleteQualification(record: QualificationRecord) {
    const confirmed = window.confirm(`「${record.name} ${record.scoreOrLevel}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    const nextQualifications = qualifications.filter((item) => item.id !== record.id);
    setQualifications(nextQualifications);
    saveQualifications(nextQualifications);

    if (qualificationEditingId === record.id) {
      closeQualificationEditor();
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero tone-grades">
        <div className="page-hero-copy">
          <p className="eyebrow">成績・資格</p>
          <h2 className="hero-title">評定平均と資格の現在地を、毎日見やすく。</h2>
          <p className="hero-description">
            学年・学期ごとの評定と資格の進み具合を、スマホで見返しやすい形に整理します。
          </p>
        </div>
      </section>

      <section className="summary-focus-card">
        <p className="metric-label">現在の評定平均</p>
        <p className="metric-value">{latestGroup ? formatAverage(latestGroup.average) : "-"}</p>
        <p className="muted-text">
          {latestGroup ? `${latestGroup.schoolYear} ${latestGroup.term}` : "まだ評定データはありません"}
        </p>
      </section>

      <section className="summary-grid">
        {summaryCards.map((item) => (
          <article key={item.label} className="summary-card tone-grades">
            <p className="metric-label">{item.label}</p>
            <p className="stat-value">{item.value}</p>
            <p className="muted-text">{item.note}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <SectionHeader title="最近の資格" description="直近で登録した資格・検定を上部で確認" />
        {latestQualification ? (
          <article className="list-card qualification-card">
            <div className="row-between gap-sm align-start">
              <div>
                <p className="item-title">{latestQualification.name}</p>
                <p className="item-subtitle">{latestQualification.scoreOrLevel}</p>
              </div>
              <span className={`status-pill ${qualificationStatusClass(latestQualification.status)}`}>
                {latestQualification.status}
              </span>
            </div>
            <div className="qualification-meta">
              <span className="mini-badge">{formatDate(latestQualification.examDate)}</span>
            </div>
            <p className="muted-text">{latestQualification.memo || "メモはまだ入力されていません"}</p>
          </article>
        ) : (
          <div className="empty-state">
            <p className="item-title small">まだ資格・検定の記録はありません</p>
            <p className="muted-text">下の「資格を追加」から記録を始められます。</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="row-between gap-sm align-start">
          <div className="compare-header no-margin">
            <span className="soft-pill">localStorage 保存</span>
            <p className="muted-text">
              学年・学期ごとに評定を記録し、自動で平均を確認できます。
            </p>
          </div>
          <button type="button" className="action-button primary" onClick={openCreateGrade}>
            <UiIcon name="plus" className="action-icon" />
            評定を追加
          </button>
        </div>
      </section>

      {(isCreatingGrade || gradeEditingId) && (
        <section className="panel">
          <SectionHeader
            title={isCreatingGrade ? "評定を追加" : "評定を編集"}
            description="学年・学期・科目ごとにあとから編集できます"
          />
          <div className="form-stack">
            <div className="field-grid">
              <label className="field-block">
                <span className="field-label">学年</span>
                <select
                  className="text-input"
                  value={gradeForm.schoolYear}
                  onChange={(event) =>
                    updateGradeForm("schoolYear", event.target.value as GradeSchoolYear)
                  }
                >
                  {schoolYearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-block">
                <span className="field-label">学期</span>
                <select
                  className="text-input"
                  value={gradeForm.term}
                  onChange={(event) => updateGradeForm("term", event.target.value as GradeTerm)}
                >
                  {termOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="field-grid">
              <label className="field-block">
                <span className="field-label">科目名</span>
                <input
                  className="text-input"
                  type="text"
                  value={gradeForm.subject}
                  onChange={(event) => updateGradeForm("subject", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">評定</span>
                <select
                  className="text-input"
                  value={gradeForm.grade}
                  onChange={(event) => updateGradeForm("grade", Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <option key={score} value={score}>
                      {score}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field-block">
              <span className="field-label">メモ（任意）</span>
              <textarea
                className="text-area"
                rows={3}
                value={gradeForm.memo}
                onChange={(event) => updateGradeForm("memo", event.target.value)}
              />
            </label>

            <div className="action-row">
              <button type="button" className="action-button primary" onClick={handleSaveGrade}>
                保存する
              </button>
              <button type="button" className="action-button" onClick={closeGradeEditor}>
                キャンセル
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <SectionHeader
          title="学年・学期ごとの記録"
          description="高3から高1の順で、同じ学年内は新しい学期を上に表示"
        />
        <div className="record-list">
          {gradeGroups.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">まだ評定の記録はありません</p>
              <p className="muted-text">最初の学期と科目を登録すると平均も自動表示されます。</p>
            </div>
          ) : (
            gradeGroups.map((group, index) => (
              <article key={group.key} className="term-card">
                <div className="term-card-header">
                  <div>
                    <p className="item-title">
                      {group.schoolYear} {group.term}
                    </p>
                    <p className="item-subtitle">{group.records.length}科目</p>
                  </div>
                  <div>
                    {index === 0 ? <span className="soft-pill">最新</span> : null}
                    <p className="term-average-large">{formatAverage(group.average)}</p>
                  </div>
                </div>

                <div className="list-stack top-gap">
                  {group.records.map((record) => (
                    <article key={record.id} className="record-row">
                      <div>
                        <p className="item-title small">{record.subject}</p>
                        <p className="item-subtitle">
                          {record.memo || "メモはまだ入力されていません"}
                        </p>
                      </div>
                      <span className="record-grade-badge">{record.grade}</span>
                      <div className="list-actions">
                        <button type="button" className="card-action subtle" onClick={() => openEditGrade(record)}>
                          <UiIcon name="edit" className="action-icon" />
                          編集
                        </button>
                        <button type="button" className="card-action danger" onClick={() => handleDeleteGrade(record)}>
                          <UiIcon name="delete" className="action-icon" />
                          削除
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="row-between gap-sm align-start">
          <div className="compare-header no-margin">
            <span className="soft-pill">資格・検定</span>
            <p className="muted-text">英検以外も含めて、状態付きで一覧管理できます。</p>
          </div>
          <button type="button" className="action-button primary" onClick={openCreateQualification}>
            <UiIcon name="plus" className="action-icon" />
            資格を追加
          </button>
        </div>
      </section>

      {(isCreatingQualification || qualificationEditingId) && (
        <section className="panel">
          <SectionHeader
            title={isCreatingQualification ? "資格を追加" : "資格を編集"}
            description="取得済み、受験予定、結果待ちを分けて保存"
          />
          <div className="form-stack">
            <div className="field-grid">
              <label className="field-block">
                <span className="field-label">資格名</span>
                <input
                  className="text-input"
                  type="text"
                  value={qualificationForm.name}
                  onChange={(event) => updateQualificationForm("name", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">級・スコア</span>
                <input
                  className="text-input"
                  type="text"
                  value={qualificationForm.scoreOrLevel}
                  onChange={(event) =>
                    updateQualificationForm("scoreOrLevel", event.target.value)
                  }
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="field-block">
                <span className="field-label">取得日または受験日</span>
                <input
                  className="text-input"
                  type="date"
                  value={qualificationForm.examDate}
                  onChange={(event) => updateQualificationForm("examDate", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">状態</span>
                <select
                  className="text-input"
                  value={qualificationForm.status}
                  onChange={(event) =>
                    updateQualificationForm("status", event.target.value as QualificationStatus)
                  }
                >
                  {qualificationStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field-block">
              <span className="field-label">メモ（任意）</span>
              <textarea
                className="text-area"
                rows={3}
                value={qualificationForm.memo}
                onChange={(event) => updateQualificationForm("memo", event.target.value)}
              />
            </label>

            <div className="action-row">
              <button
                type="button"
                className="action-button primary"
                onClick={handleSaveQualification}
              >
                保存する
              </button>
              <button type="button" className="action-button" onClick={closeQualificationEditor}>
                キャンセル
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <SectionHeader title="資格・検定一覧" description="日付の新しい順で表示" />
        <div className="list-stack">
          {sortedQualifications.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">まだ資格・検定の記録はありません</p>
              <p className="muted-text">受験予定からでも先に登録できます。</p>
            </div>
          ) : (
            sortedQualifications.map((record) => (
              <article key={record.id} className="list-card qualification-card">
                <div className="row-between gap-sm align-start">
                  <div>
                    <p className="item-title">{record.name}</p>
                    <p className="item-subtitle">{record.scoreOrLevel}</p>
                  </div>
                  <span className={`status-pill ${qualificationStatusClass(record.status)}`}>
                    {record.status}
                  </span>
                </div>
                <div className="qualification-meta">
                  <span className="mini-badge">{formatDate(record.examDate)}</span>
                  <span className="mini-badge">{record.scoreOrLevel}</span>
                </div>
                <p className="muted-text">{record.memo || "メモはまだ入力されていません"}</p>
                <div className="list-actions">
                  <button
                    type="button"
                    className="card-action subtle"
                    onClick={() => openEditQualification(record)}
                  >
                    <UiIcon name="edit" className="action-icon" />
                    編集
                  </button>
                  <button
                    type="button"
                    className="card-action danger"
                    onClick={() => handleDeleteQualification(record)}
                  >
                    <UiIcon name="delete" className="action-icon" />
                    削除
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
