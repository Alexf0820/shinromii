"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CardActionBar } from "@/components/CardActionBar";
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
  examCount,
  examTotal,
  gradeFromExamScores,
  hasAnyExamScore,
  normalizeExamScores,
} from "@/lib/grading-rule";
import type { ExamScores } from "@/lib/grading-rule";
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
  midtermScore: string;
  finalScore: string;
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
    midtermScore: "",
    finalScore: "",
  };
}

function parseScoreInput(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

function formScores(form: GradeFormState): ExamScores {
  return {
    midterm: parseScoreInput(form.midtermScore),
    final: parseScoreInput(form.finalScore),
  };
}

function recordScores(record: GradeRecord) {
  return normalizeExamScores(record.scores);
}

function formatScore(score: number | null) {
  return score === null ? "未実施" : `${score}点`;
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
  const scores = recordScores(record);

  return {
    schoolYear: record.schoolYear,
    term: record.term,
    subject: record.subject,
    grade: record.grade,
    memo: record.memo,
    midtermScore: scores?.midterm === null || scores?.midterm === undefined ? "" : String(scores.midterm),
    finalScore: scores?.final === null || scores?.final === undefined ? "" : String(scores.final),
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

type GradesTab = "grades" | "qualifications";

export function GradesClient() {
  const [activeTab, setActiveTab] = useState<GradesTab>("grades");
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>(initialGradeRecords);
  const [qualifications, setQualifications] = useState<QualificationRecord[]>(initialQualifications);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [gradeEditingId, setGradeEditingId] = useState<string | null>(null);
  const [qualificationEditingId, setQualificationEditingId] = useState<string | null>(null);
  const [isCreatingGrade, setIsCreatingGrade] = useState(false);
  const [isCreatingQualification, setIsCreatingQualification] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeFormState>(createEmptyGradeForm());
  const [qualificationForm, setQualificationForm] = useState<QualificationFormState>(
    createEmptyQualificationForm(),
  );
  const [pendingGradeScrollId, setPendingGradeScrollId] = useState<string | null>(null);
  const [pendingGradeEditScrollId, setPendingGradeEditScrollId] = useState<string | null>(null);
  const [pendingQualificationEditScrollId, setPendingQualificationEditScrollId] = useState<string | null>(null);
  const gradesSectionRef = useRef<HTMLElement | null>(null);
  const gradeDetailRefs = useRef<Record<string, HTMLElement | null>>({});
  const gradeEditRefs = useRef<Record<string, HTMLElement | null>>({});
  const qualificationEditRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const storage = loadShinromiiStorage();
    setGradeRecords(storage.gradeRecords);
    setQualifications(storage.qualifications);
  }, []);

  useEffect(() => {
    if (window.location.hash !== "#grades") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      gradesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
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

  const summaryStats = useMemo(() => {
    const stats: { label: string; value: string }[] = [];
    const overallAverage = average(gradeRecords.map((item) => item.grade));

    schoolYearOptions.forEach((schoolYear) => {
      const yearAverage = average(
        gradeRecords.filter((item) => item.schoolYear === schoolYear).map((item) => item.grade),
      );

      if (yearAverage !== null) {
        stats.push({
          label: `${schoolYear}平均`,
          value: formatAverage(yearAverage),
        });
      }
    });

    if (overallAverage !== null) {
      stats.push({
        label: "全期間",
        value: formatAverage(overallAverage),
      });
    }

    return stats;
  }, [gradeRecords]);

  const gradeFormScoreNote = useMemo(() => {
    const scores = formScores(gradeForm);
    const autoGrade = gradeFromExamScores(scores);

    if (autoGrade === null) {
      return "得点を入力すると評定を自動計算します。中間が実施されていない科目は空欄のままにしてください。";
    }

    const total = examTotal(scores);

    if (examCount(scores) >= 2) {
      return `中間 ${scores.midterm} ＋ 期末 ${scores.final} = 合計 ${total}点 → 評定 ${autoGrade}`;
    }

    const label = scores.midterm === null ? "期末のみ" : "中間のみ";

    return `${label} ${total}点 → 評定 ${autoGrade}`;
  }, [gradeForm]);

  function updateGradeForm<K extends keyof GradeFormState>(key: K, value: GradeFormState[K]) {
    setGradeForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateGradeScore(key: "midtermScore" | "finalScore", value: string) {
    setGradeForm((current) => {
      const next = { ...current, [key]: value };
      const autoGrade = gradeFromExamScores(formScores(next));

      return autoGrade === null ? next : { ...next, grade: autoGrade };
    });
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
    setPendingGradeEditScrollId(null);
    setGradeForm(createEmptyGradeForm());
  }

  function openEditGrade(record: GradeRecord) {
    setIsCreatingGrade(false);
    setGradeEditingId(record.id);
    setSelectedGradeId(null);
    setPendingGradeScrollId(null);
    setPendingGradeEditScrollId(record.id);
    setGradeForm(formFromGradeRecord(record));
  }

  function closeGradeEditor() {
    setIsCreatingGrade(false);
    setGradeEditingId(null);
    setPendingGradeEditScrollId(null);
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

    const scores = formScores(gradeForm);
    const autoGrade = gradeFromExamScores(scores);

    const nextRecord: GradeRecord = {
      id: gradeEditingId ?? createId("grade"),
      schoolYear: gradeForm.schoolYear,
      term: gradeForm.term,
      subject: gradeForm.subject.trim(),
      grade: autoGrade ?? gradeForm.grade,
      memo: gradeForm.memo.trim(),
      createdAt: currentRecord?.createdAt ?? now,
      updatedAt: now,
      ...(hasAnyExamScore(scores) ? { scores } : {}),
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

    if (selectedGradeId === record.id) {
      setSelectedGradeId(null);
      setPendingGradeScrollId(null);
    }

    if (gradeEditingId === record.id) {
      closeGradeEditor();
    }
  }

  function openCreateQualification() {
    setIsCreatingQualification(true);
    setQualificationEditingId(null);
    setPendingQualificationEditScrollId(null);
    setQualificationForm(createEmptyQualificationForm());
  }

  function openEditQualification(record: QualificationRecord) {
    setIsCreatingQualification(false);
    setQualificationEditingId(record.id);
    setPendingQualificationEditScrollId(record.id);
    setQualificationForm(formFromQualification(record));
  }

  function closeQualificationEditor() {
    setIsCreatingQualification(false);
    setQualificationEditingId(null);
    setPendingQualificationEditScrollId(null);
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

  function toggleGradeDetail(id: string) {
    if (gradeEditingId) {
      closeGradeEditor();
    }

    setSelectedGradeId((current) => {
      const nextId = current === id ? null : id;

      if (nextId) {
        setPendingGradeScrollId(nextId);
      } else {
        setPendingGradeScrollId(null);
      }

      return nextId;
    });
  }

  function renderGradeScoreSection(record: GradeRecord) {
    const scores = recordScores(record);

    if (!scores) {
      return null;
    }

    const total = examTotal(scores);
    const autoGrade = gradeFromExamScores(scores);

    return (
      <section className="detail-section">
        <p className="feedback-label">テストの得点</p>
        <div className="detail-entry top-gap">
          <span className="detail-entry-label">中間</span>
          <span className="detail-entry-value">{formatScore(scores.midterm)}</span>
        </div>
        <div className="detail-entry">
          <span className="detail-entry-label">期末</span>
          <span className="detail-entry-value">{formatScore(scores.final)}</span>
        </div>
        <div className="detail-entry">
          <span className="detail-entry-label">合計</span>
          <span className="detail-entry-value">
            {total}点（{examCount(scores)}回受験）
          </span>
        </div>
        {autoGrade === null ? null : (
          <div className="detail-entry">
            <span className="detail-entry-label">自動評定</span>
            <span className="detail-entry-value">{autoGrade}</span>
          </div>
        )}
      </section>
    );
  }

  function renderGradeDetail(record: GradeRecord) {
    return (
      <section
        ref={(node) => {
          gradeDetailRefs.current[record.id] = node;
        }}
        className="detail-card inline-detail-card inline-grade-detail-card"
      >
        <div className="detail-section-header">
          <div>
            <p className="eyebrow">評定詳細</p>
            <p className="item-title">{record.subject}</p>
            <p className="item-subtitle">
              {record.schoolYear} / {record.term}
            </p>
          </div>
          <span className="record-grade-badge">{record.grade}</span>
        </div>

        <div className="detail-section-list top-gap">
          <section className="detail-section">
            <p className="feedback-label">基本情報</p>
            <div className="detail-entry top-gap">
              <span className="detail-entry-label">学年</span>
              <span className="detail-entry-value">{record.schoolYear}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">学期</span>
              <span className="detail-entry-value">{record.term}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">科目名</span>
              <span className="detail-entry-value">{record.subject}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">評定</span>
              <span className="detail-entry-value">{record.grade}</span>
            </div>
          </section>

          {renderGradeScoreSection(record)}

          <section className="detail-section">
            <p className="feedback-label">メモ</p>
            <div className="detail-entry top-gap">
              <span className="detail-entry-label">登録メモ</span>
              <span className="detail-entry-value preserve-lines">
                {record.memo || "まだ入力されていません"}
              </span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">作成日</span>
              <span className="detail-entry-value">{formatDate(record.createdAt)}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">更新日</span>
              <span className="detail-entry-value">{formatDate(record.updatedAt)}</span>
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderGradeEditor(title: string, description: string, editorId?: string) {
    return (
      <section
        ref={(node) => {
          if (editorId) {
            gradeEditRefs.current[editorId] = node;
          }
        }}
        className="panel inline-detail-card inline-editor-card"
      >
        <SectionHeader title={title} description={description} />
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

          <div className="field-grid">
            <label className="field-block">
              <span className="field-label">中間（未実施なら空欄）</span>
              <input
                className="text-input"
                type="number"
                inputMode="numeric"
                value={gradeForm.midtermScore}
                onChange={(event) => updateGradeScore("midtermScore", event.target.value)}
              />
            </label>

            <label className="field-block">
              <span className="field-label">期末</span>
              <input
                className="text-input"
                type="number"
                inputMode="numeric"
                value={gradeForm.finalScore}
                onChange={(event) => updateGradeScore("finalScore", event.target.value)}
              />
            </label>
          </div>

          <p className="field-help">{gradeFormScoreNote}</p>

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
    );
  }

  function renderQualificationEditor(title: string, description: string, editorId?: string) {
    return (
      <section
        ref={(node) => {
          if (editorId) {
            qualificationEditRefs.current[editorId] = node;
          }
        }}
        className="panel inline-detail-card inline-editor-card"
      >
        <SectionHeader title={title} description={description} />
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
                onChange={(event) => updateQualificationForm("scoreOrLevel", event.target.value)}
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
    );
  }

  useEffect(() => {
    if (!pendingGradeScrollId || pendingGradeScrollId !== selectedGradeId) {
      return;
    }

    const element = gradeDetailRefs.current[pendingGradeScrollId];

    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingGradeScrollId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pendingGradeScrollId, selectedGradeId]);

  useEffect(() => {
    if (!pendingGradeEditScrollId || pendingGradeEditScrollId !== gradeEditingId) {
      return;
    }

    const element = gradeEditRefs.current[pendingGradeEditScrollId];

    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingGradeEditScrollId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [gradeEditingId, pendingGradeEditScrollId]);

  useEffect(() => {
    if (
      !pendingQualificationEditScrollId ||
      pendingQualificationEditScrollId !== qualificationEditingId
    ) {
      return;
    }

    const element = qualificationEditRefs.current[pendingQualificationEditScrollId];

    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingQualificationEditScrollId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pendingQualificationEditScrollId, qualificationEditingId]);

  return (
    <div className="grades-page">
      <div className="grades-tabs" role="tablist" aria-label="成績・資格の表示切り替え">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "grades"}
          className={`grades-tab ${activeTab === "grades" ? "active" : ""}`}
          onClick={() => setActiveTab("grades")}
        >
          評定
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "qualifications"}
          className={`grades-tab ${activeTab === "qualifications" ? "active" : ""}`}
          onClick={() => setActiveTab("qualifications")}
        >
          資格・検定
        </button>
      </div>

      {activeTab === "grades" ? (
        <>
          <section className="grade-summary-card">
            <p className="grade-summary-label">最新の評定平均</p>
            <p className="grade-summary-value">
              {latestGroup ? formatAverage(latestGroup.average) : "-"}
            </p>
            <p className="grade-summary-note">
              {latestGroup
                ? `${latestGroup.schoolYear} ${latestGroup.term}`
                : "まだ評定データはありません"}
            </p>
            {summaryStats.length > 0 ? (
              <div className="grade-summary-row">
                {summaryStats.map((item) => (
                  <div key={item.label} className="grade-summary-stat">
                    <span className="grade-summary-stat-label">{item.label}</span>
                    <span className="grade-summary-stat-value">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section ref={gradesSectionRef} id="grades" className="grades-section">
            <div className="grades-section-head">
              <div className="grades-section-copy">
                <h2 className="grades-section-title">学年・学期ごとの記録</h2>
                <p className="grades-section-note">高3から高1の順で表示</p>
              </div>
              <button
                type="button"
                className="grades-add-button"
                onClick={openCreateGrade}
                aria-label="評定を追加"
              >
                <UiIcon name="plus" className="grades-add-icon" />
              </button>
            </div>

            {isCreatingGrade
              ? renderGradeEditor("評定を追加", "学年・学期・科目ごとにあとから編集できます")
              : null}

            <div className="term-list">
              {gradeGroups.length === 0 ? (
                <div className="empty-state">
                  <p className="item-title small">まだ評定の記録はありません</p>
                  <p className="muted-text">最初の学期と科目を登録すると平均も自動表示されます。</p>
                </div>
              ) : (
                gradeGroups.map((group, index) => (
                  <article key={group.key} className="term-card">
                    <div className="term-card-head">
                      <div className="term-card-heading">
                        <p className="term-card-name">
                          {group.schoolYear} {group.term}
                          {index === 0 ? <span className="term-latest-badge">最新</span> : null}
                        </p>
                        <p className="term-card-count">{group.records.length}科目</p>
                      </div>
                      <p className="term-card-average">{formatAverage(group.average)}</p>
                    </div>

                    <div className="subject-list">
                      {group.records.map((record) => (
                        <div key={record.id} className="detail-stack subject-stack">
                          <article className="subject-row">
                            <div className="subject-row-head">
                              <p className="subject-name">{record.subject}</p>
                              <span className="subject-grade">{record.grade}</span>
                            </div>
                            {record.memo ? <p className="subject-memo">{record.memo}</p> : null}
                            <CardActionBar
                              actions={[
                                {
                                  icon: "detail",
                                  label: selectedGradeId === record.id ? "閉じる" : "詳細",
                                  onClick: () => toggleGradeDetail(record.id),
                                },
                                {
                                  icon: "edit",
                                  label: gradeEditingId === record.id ? "閉じる" : "編集",
                                  onClick: () =>
                                    gradeEditingId === record.id
                                      ? closeGradeEditor()
                                      : openEditGrade(record),
                                },
                                {
                                  icon: "delete",
                                  label: "削除",
                                  onClick: () => handleDeleteGrade(record),
                                  variant: "danger",
                                },
                              ]}
                            />
                          </article>

                          {selectedGradeId === record.id ? renderGradeDetail(record) : null}
                          {gradeEditingId === record.id
                            ? renderGradeEditor(
                                `${record.subject}を編集`,
                                "学年・学期・科目ごとにあとから編集できます",
                                record.id,
                              )
                            : null}
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="grades-section">
          <div className="grades-section-head">
            <div className="grades-section-copy">
              <h2 className="grades-section-title">資格・検定</h2>
              <p className="grades-section-note">日付の新しい順で表示</p>
            </div>
            <button
              type="button"
              className="grades-add-button"
              onClick={openCreateQualification}
              aria-label="資格を追加"
            >
              <UiIcon name="plus" className="grades-add-icon" />
            </button>
          </div>

          {isCreatingQualification
            ? renderQualificationEditor("資格を追加", "取得済み、受験予定、結果待ちを分けて保存")
            : null}

          <div className="qual-list">
            {sortedQualifications.length === 0 ? (
              <div className="empty-state">
                <p className="item-title small">まだ資格・検定の記録はありません</p>
                <p className="muted-text">受験予定からでも先に登録できます。</p>
              </div>
            ) : (
              sortedQualifications.map((record) => (
                <div key={record.id} className="detail-stack subject-stack">
                  <article className="qual-card">
                    <div className="qual-card-head">
                      <div className="qual-card-copy">
                        <p className="qual-name">
                          {record.name}
                          <span className="qual-score">{record.scoreOrLevel}</span>
                        </p>
                        <p className="qual-date">{formatDate(record.examDate)}</p>
                      </div>
                      <span className={`status-pill ${qualificationStatusClass(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                    {record.memo ? <p className="qual-memo">{record.memo}</p> : null}
                    <CardActionBar
                      actions={[
                        {
                          icon: "edit",
                          label: qualificationEditingId === record.id ? "閉じる" : "編集",
                          onClick: () =>
                            qualificationEditingId === record.id
                              ? closeQualificationEditor()
                              : openEditQualification(record),
                        },
                        {
                          icon: "delete",
                          label: "削除",
                          onClick: () => handleDeleteQualification(record),
                          variant: "danger",
                        },
                      ]}
                    />
                  </article>

                  {qualificationEditingId === record.id
                    ? renderQualificationEditor(
                        `${record.name}を編集`,
                        "取得済み、受験予定、結果待ちを分けて保存",
                        record.id,
                      )
                    : null}
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
