"use client";
import { summarizeReferenceGrades, formatReferenceAverage as formatAverage, sameGradeSubject } from "@/lib/reference-grades";
import { GradeReferenceInfo, GradeReferenceNotice } from "@/components/GradeReferenceNotice";

import { normalizePeriodSystem, resolveGradePeriod, gradePeriodLabel, activePeriodIds, PERIOD_IDS, type GradePeriodSystem } from "@/lib/grade-periods";
import { isDemoMode } from "@/lib/shinromii-demo-mode";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CardActionBar } from "@/components/CardActionBar";
import { SchoolTemplateButton } from "@/components/grades/SchoolTemplateButton";
import { GradeRecordForm } from "@/components/grades/GradeRecordForm";
import { QualificationRecordForm } from "@/components/grades/QualificationRecordForm";
import { UiIcon } from "@/components/UiIcon";
import { gradeRecords as initialGradeRecords, qualifications as initialQualifications } from "@/data/mockData";
import type {
  GradeRecord,
  GradeSchoolYear,
  QualificationRecord,
  QualificationStatus,
} from "@/data/mockData";
import {
  eikenLevelRank,
  formatEikenCseCardScore,
  isEikenQualification,
  parseEikenExamNote,
  qualificationEikenScores,
} from "@/lib/eiken";
import { examCount, examTotal, normalizeExamScores } from "@/lib/grading-rule";
import {
  buildGradeRecord,
  createEmptyGradeForm,
  formFromGradeRecord,
  type GradeFormState,
} from "@/lib/grade-form";
import {
  buildQualificationRecord,
  createEmptyQualificationForm,
  formFromQualification,
  type QualificationFormState,
} from "@/lib/qualification-form";
import {
  loadShinromiiStorage,
  saveGradeRecords,
  saveGradePeriodSystem,
  saveQualifications,
} from "@/lib/shinromii-storage";

function handleCardKeyActivate(event: KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

const schoolYearRank: Record<GradeSchoolYear, number> = {
  高1: 1,
  高2: 2,
  高3: 3,
};

function recordScores(record: GradeRecord) {
  return normalizeExamScores(record.scores);
}

function formatScore(score: number | null) {
  return score === null ? "未実施" : `${score}点`;
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

    const termDiff = PERIOD_IDS.indexOf(resolveGradePeriod(b)!) - PERIOD_IDS.indexOf(resolveGradePeriod(a)!);

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

    const levelDiff = eikenLevelRank(b.scoreOrLevel) - eikenLevelRank(a.scoreOrLevel);

    if (levelDiff !== 0) {
      return levelDiff;
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
  const periodPanelId = useId();
  const [expandedPeriod, setExpandedPeriod] = useState<string | null | undefined>(undefined);
  const [periodSystem, setPeriodSystem] = useState<GradePeriodSystem>("three-term");
  const [subjectRevision, setSubjectRevision] = useState(0);
  const [activeTab, setActiveTab] = useState<GradesTab>("grades");
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>(() => isDemoMode() ? [] : initialGradeRecords);
  const [qualifications, setQualifications] = useState<QualificationRecord[]>(() => isDemoMode() ? [] : initialQualifications);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [gradeEditingId, setGradeEditingId] = useState<string | null>(null);
  const [selectedQualificationId, setSelectedQualificationId] = useState<string | null>(null);
  const [qualificationEditingId, setQualificationEditingId] = useState<string | null>(null);
  const [isCreatingGrade, setIsCreatingGrade] = useState(false);
  const [isCreatingQualification, setIsCreatingQualification] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeFormState>(createEmptyGradeForm());
  const [qualificationForm, setQualificationForm] = useState<QualificationFormState>(
    createEmptyQualificationForm(),
  );
  const [pendingGradeScrollId, setPendingGradeScrollId] = useState<string | null>(null);
  const [pendingGradeEditScrollId, setPendingGradeEditScrollId] = useState<string | null>(null);
  const [pendingQualificationScrollId, setPendingQualificationScrollId] = useState<string | null>(null);
  const [pendingQualificationEditScrollId, setPendingQualificationEditScrollId] = useState<string | null>(null);
  const gradesSectionRef = useRef<HTMLElement | null>(null);
  const gradeDetailRefs = useRef<Record<string, HTMLElement | null>>({});
  const gradeEditRefs = useRef<Record<string, HTMLElement | null>>({});
  const qualificationDetailRefs = useRef<Record<string, HTMLElement | null>>({});
  const qualificationEditRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const storage = loadShinromiiStorage();
    setPeriodSystem(normalizePeriodSystem(storage.gradePeriodSystem));
    setGradeRecords(storage.gradeRecords);
    setQualifications(storage.qualifications);
  }, []);

  useEffect(() => {
    if (window.location.hash === "#qualifications") {
      setActiveTab("qualifications");
    }
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

  const reference = useMemo(() => summarizeReferenceGrades(sortedGradeRecords, periodSystem), [sortedGradeRecords, periodSystem]);
  const gradeGroups = reference.periods;
  const latestGroup = reference.latest;
  const openPeriodKey = expandedPeriod === undefined ? latestGroup?.key : expandedPeriod;
  const summaryStats = reference.annual.map(year => ({
    label: `${year.schoolYear} 年間参考平均`, value: formatAverage(year.average),
    note: `有効${year.count}科目／年間評定優先${year.supplemented ? "／期間平均による補完あり" : ""}`,
    excluded: year.excluded,
  }));

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
    const currentRecord = gradeEditingId
      ? gradeRecords.find((item) => item.id === gradeEditingId) ?? null
      : null;
    const nextRecord = buildGradeRecord({
      form: gradeForm,
      existing: currentRecord,
      gradingMethod: "manual",
    });

    if (!nextRecord || !activePeriodIds(periodSystem).includes(gradeForm.term)) {
      window.alert("科目名と評定（1〜5）を選択してください。");
      return;
    }

    if (gradeRecords.some(item => item.id !== gradeEditingId && sameGradeSubject(item, nextRecord)) &&
        (!currentRecord || !sameGradeSubject(currentRecord, nextRecord))) {
      window.alert("同じ学年・学期・科目は登録済みです。既存レコードの「編集」から変更してください。");
      return;
    }
    const nextRecords = gradeEditingId
      ? gradeRecords.map((item) => (item.id === gradeEditingId ? nextRecord : item))
      : [nextRecord, ...gradeRecords];

    setGradeRecords(nextRecords);
    saveGradeRecords(nextRecords);
    closeGradeEditor();
  }

  function handleDeleteGrade(record: GradeRecord) {
    const confirmed = window.confirm(
      `「${record.schoolYear} ${gradePeriodLabel(resolveGradePeriod(record), periodSystem)} ${record.subject}」を削除しますか？`,
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
    setSelectedQualificationId(null);
    setPendingQualificationScrollId(null);
    setPendingQualificationEditScrollId(null);
    setQualificationForm(createEmptyQualificationForm());
  }

  function openEditQualification(record: QualificationRecord) {
    setIsCreatingQualification(false);
    setSelectedQualificationId(null);
    setPendingQualificationScrollId(null);
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
    const currentRecord = qualificationEditingId
      ? qualifications.find((item) => item.id === qualificationEditingId) ?? null
      : null;
    const nextRecord = buildQualificationRecord({
      form: qualificationForm,
      existing: currentRecord,
    });

    if (!nextRecord || !activePeriodIds(periodSystem).includes(gradeForm.term)) {
      window.alert("資格名と級・スコアを入力してください。");
      return;
    }

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

    if (selectedQualificationId === record.id) {
      setSelectedQualificationId(null);
      setPendingQualificationScrollId(null);
    }
  }

  function toggleQualificationDetail(id: string) {
    if (qualificationEditingId) {
      closeQualificationEditor();
    }

    setIsCreatingQualification(false);
    setSelectedQualificationId((current) => {
      const nextId = current === id ? null : id;

      if (nextId) {
        setPendingQualificationScrollId(nextId);
      } else {
        setPendingQualificationScrollId(null);
      }

      return nextId;
    });
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

    return (
      <section className="detail-group">
        <p className="detail-group-title">テスト結果</p>
        <div className="grade-score-cards">
          <div className="grade-score-card">
            <span className="grade-score-card-label">中間</span>
            <span className="grade-score-card-value">{formatScore(scores.midterm)}</span>
          </div>
          <div className="grade-score-card">
            <span className="grade-score-card-label">期末</span>
            <span className="grade-score-card-value">{formatScore(scores.final)}</span>
          </div>
          <div className="grade-score-card">
            <span className="grade-score-card-label">合計</span>
            <span className="grade-score-card-value">{total === null ? "-" : `${total}点`}</span>
            <span className="grade-score-card-note">{examCount(scores)}回受験</span>
          </div>
        </div>
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
              {record.schoolYear} / {gradePeriodLabel(resolveGradePeriod(record), periodSystem)}
            </p>
          </div>
          <div className="grade-detail-aside">
            <span className="record-grade-badge">
              <span className="record-grade-badge-label">評定</span>
              <span className="record-grade-badge-value">{record.grade}</span>
            </span>

          </div>
        </div>

        <div className="top-gap">
          {renderGradeScoreSection(record)}

          {record.memo || record.createdAt || record.updatedAt ? (
            <section className="detail-group">
              <p className="detail-group-title">補足</p>
              {record.memo ? (
                <div className="review-note">
                  <span className="review-note-label">メモ</span>
                  <p className="review-note-body preserve-lines">{record.memo}</p>
                </div>
              ) : null}
              <div className={`review-meta${record.memo ? " top-gap" : ""}`}>
                {record.createdAt ? <span>作成 {formatDate(record.createdAt)}</span> : null}
                {record.updatedAt ? <span>更新 {formatDate(record.updatedAt)}</span> : null}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    );
  }

  function renderGradeEditor(title: string, description: string, editorId?: string) {
    return (
      <div
        ref={(node) => {
          if (editorId) {
            gradeEditRefs.current[editorId] = node;
          }
        }}
      >
        <GradeRecordForm key={subjectRevision} periodSystem={periodSystem}
          title={title}
          description={description}
          form={gradeForm}
          onChange={setGradeForm}
          onSave={handleSaveGrade}
          onCancel={closeGradeEditor}
          gradingMethod="manual"
        />
      </div>
    );
  }

  function renderQualificationDetail(record: QualificationRecord) {
    const isEiken = isEikenQualification(record);
    const eikenScores = isEiken ? qualificationEikenScores(record) : undefined;
    const examNote = isEiken ? parseEikenExamNote(record.memo) : null;
    const cseCardScore = formatEikenCseCardScore(record);
    const skillEntries = [
      { label: "Reading", value: eikenScores?.reading },
      { label: "Listening", value: eikenScores?.listening },
      { label: "Writing", value: eikenScores?.writing },
      { label: "Speaking", value: eikenScores?.speaking },
    ].filter((entry) => entry.value !== undefined);
    const title = [record.name, record.scoreOrLevel].filter(Boolean).join(" ");
    const extraMemo = examNote ? "" : record.memo.trim();

    return (
      <section
        ref={(node) => {
          qualificationDetailRefs.current[record.id] = node;
        }}
        className="detail-card inline-detail-card inline-qual-detail-card"
      >
        <div className="detail-section-header">
          <div>
            <p className="eyebrow">資格詳細</p>
            <p className="item-title">{title}</p>
            {examNote?.examName ? <p className="item-subtitle">{examNote.examName}</p> : null}
            {examNote?.examSession ? <p className="item-subtitle">{examNote.examSession}</p> : null}
          </div>
          <div className="eiken-cse-aside">
            <span className={`status-pill ${qualificationStatusClass(record.status)}`}>{record.status}</span>
            {cseCardScore ? (
              <span className="eiken-cse-badge">
                <span className="eiken-cse-badge-label">CSE</span>
                <span className="eiken-cse-badge-value">{cseCardScore}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="top-gap">
          {cseCardScore || eikenScores?.cefr ? (
            <section className="detail-group">
              <p className="detail-group-title">英検スコア</p>
              <div className="eiken-summary-cards">
                {cseCardScore ? (
                  <div className="grade-score-card eiken-cse-card">
                    <span className="grade-score-card-label">CSE</span>
                    <span className="grade-score-card-value">{cseCardScore}</span>
                  </div>
                ) : null}
                {eikenScores?.cefr ? (
                  <div className="grade-score-card">
                    <span className="grade-score-card-label">CEFR</span>
                    <span className="grade-score-card-value">{eikenScores.cefr}</span>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {skillEntries.length > 0 ? (
            <section className="detail-group">
              <p className="detail-group-title">4技能</p>
              <div className="eiken-skill-cards">
                {skillEntries.map((entry) => (
                  <div key={entry.label} className="grade-score-card">
                    <span className="grade-score-card-label">{entry.label}</span>
                    <span className="grade-score-card-value">{entry.value}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {record.examDate || extraMemo ? (
            <section className="detail-group">
              <p className="detail-group-title">補足</p>
              {record.examDate ? (
                <div className="review-note">
                  <span className="review-note-label">取得日</span>
                  <p className="review-note-body">{formatDate(record.examDate)}</p>
                </div>
              ) : null}
              {extraMemo ? (
                <div className="review-note">
                  <span className="review-note-label">メモ</span>
                  <p className="review-note-body preserve-lines">{extraMemo}</p>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    );
  }

  function renderQualificationEditor(title: string, description: string, editorId?: string) {
    return (
      <div
        ref={(node) => {
          if (editorId) {
            qualificationEditRefs.current[editorId] = node;
          }
        }}
      >
        <QualificationRecordForm
          title={title}
          description={description}
          form={qualificationForm}
          onChange={setQualificationForm}
          onSave={handleSaveQualification}
          onCancel={closeQualificationEditor}
        />
      </div>
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

  useEffect(() => {
    if (!pendingQualificationScrollId || pendingQualificationScrollId !== selectedQualificationId) {
      return;
    }

    const element = qualificationDetailRefs.current[pendingQualificationScrollId];

    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingQualificationScrollId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pendingQualificationScrollId, selectedQualificationId]);

  return (
    <div className="grades-page">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SchoolTemplateButton onApplied={() => setSubjectRevision((value) => value + 1)} />
      </div>
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
          <section className="panel grade-period-settings">
            <label className="field-block"><span className="field-label">成績の区切り</span>
              <select className="text-input" value={periodSystem} onChange={event => {
                if (!window.confirm("成績期間の表示と集計対象を変更します。保存済みの評定は書き換えません。2学期制では3学期の記録を保持したまま集計から除外します。変更しますか？")) return;
                const next = normalizePeriodSystem(event.target.value);
                saveGradePeriodSystem(next); setPeriodSystem(next); closeGradeEditor();
              }}>
                <option value="three-term">3学期制（1学期 / 2学期 / 3学期）</option>
                <option value="two-term">2学期制（前期 / 後期）</option>
              </select>
            </label>
            <p className="field-help">年間評定はどちらの制度でも登録できます。設定はこのノート全学年に適用されます。旧1学期は前期、旧2学期は後期として表示します。</p>
          </section>
          <section className="grade-summary-card">
            <p className="grade-summary-label">参考評定平均 <GradeReferenceInfo /></p>
            <p className="grade-summary-value">
              {latestGroup ? formatAverage(latestGroup.average) : "—"}
            </p>
            <p className="grade-summary-note">
              {latestGroup
                ? `${latestGroup.schoolYear}・${latestGroup.label}／有効${latestGroup.count}科目`
                : "まだ評定データはありません"}
            </p>
            <GradeReferenceNotice />
            {reference.excluded > 0 && <p role="status" className="grade-reference-notice">重複などにより{reference.excluded}科目を集計から除外しています。異なる評定の重複や未入力値をご確認ください。</p>}
            {reference.invalidRecords > 0 && <p className="grade-reference-notice">無効な評定{reference.invalidRecords}件は平均に含めていません。</p>}
            {summaryStats.length > 0 ? (
              <div className="grade-summary-row">
                {summaryStats.map((item) => (
                  <div key={item.label} className="grade-summary-stat">
                    <span className="grade-summary-stat-label">{item.label}</span>
                    <span className="grade-summary-stat-value">{item.value} <GradeReferenceInfo /></span>
                    <span>{item.note}</span>
                    {item.excluded > 0 && <span className="grade-reference-notice">{item.excluded}科目を年間集計から除外</span>}
                    <GradeReferenceNotice />
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
                    <div className="term-card-head term-accordion-head">
                      <button
                        type="button"
                        className="term-accordion-toggle"
                        aria-expanded={openPeriodKey === group.key}
                        aria-controls={`${periodPanelId}-${index}`}
                        onClick={() => setExpandedPeriod(openPeriodKey === group.key ? null : group.key)}
                      >
                        <span className="term-card-heading">
                          <span className="term-card-name">
                            {group.schoolYear} {group.label}
                            {group.key === latestGroup?.key ? <span className="term-latest-badge">最新</span> : null}
                          </span>
                          <span className="term-card-count">有効{group.count}科目</span>
                          <span className="term-accordion-hint">{openPeriodKey === group.key ? "科目の詳細を閉じる" : "科目の詳細を展開表示"}</span>
                        </span>
                        <span className="term-card-average"><small>参考評定平均</small>{formatAverage(group.average)}</span>
                        <span className="term-accordion-arrow" aria-hidden="true">{openPeriodKey === group.key ? "▲" : "▼"}</span>
                      </button>
                      <GradeReferenceInfo />
                    </div>

                    <div id={`${periodPanelId}-${index}`} hidden={openPeriodKey !== group.key}>
                    <GradeReferenceNotice />
                    {group.excluded > 0 && <p className="grade-reference-notice">重複などにより{group.excluded}科目を集計から除外しています。</p>}
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
              sortedQualifications.map((record) => {
                const cseCardScore = formatEikenCseCardScore(record);

                return (
                <div key={record.id} className="detail-stack subject-stack">
                  <article
                    className={`qual-card ${selectedQualificationId === record.id || qualificationEditingId === record.id ? "is-open" : ""}`}
                  >
                    <div
                      className="card-tap-area"
                      role="button"
                      tabIndex={0}
                      aria-expanded={selectedQualificationId === record.id}
                      aria-label={`${record.name}の詳細`}
                      onClick={() => toggleQualificationDetail(record.id)}
                      onKeyDown={(event) =>
                        handleCardKeyActivate(event, () => toggleQualificationDetail(record.id))
                      }
                    >
                      <div className="qual-card-head">
                        <div className="qual-card-copy">
                          <p className="qual-name">
                            {record.name}
                            <span className="qual-score">{record.scoreOrLevel}</span>
                            {cseCardScore ? <span className="qual-cse">{cseCardScore}</span> : null}
                          </p>
                          {record.examDate ? <p className="qual-date">{formatDate(record.examDate)}</p> : null}
                        </div>
                        <span className={`status-pill ${qualificationStatusClass(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                      {record.memo ? <p className="qual-memo">{record.memo}</p> : null}
                    </div>
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

                  {selectedQualificationId === record.id ? renderQualificationDetail(record) : null}
                  {qualificationEditingId === record.id
                    ? renderQualificationEditor(
                        `${record.name}を編集`,
                        "取得済み、受験予定、結果待ちを分けて保存",
                        record.id,
                      )
                    : null}
                </div>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
