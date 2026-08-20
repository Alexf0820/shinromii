import type { GradeRecord, GradeSchoolYear, GradeTerm } from "@/data/mockData";
import { createShinromiiId } from "@/lib/shinromii-id";
import {
  examCount,
  examTotal,
  gradeFromExamScores,
  gradingProfiles,
  hasAnyExamScore,
  normalizeExamScores,
  type ExamScores,
  type GradingMethod,
} from "@/lib/grading-rule";

export type GradeFormState = {
  schoolYear: GradeSchoolYear;
  term: GradeTerm;
  subject: string;
  grade: number;
  memo: string;
  midtermScore: string;
  finalScore: string;
};

export const GRADE_SCHOOL_YEAR_OPTIONS: GradeSchoolYear[] = ["高1", "高2", "高3"];
export const GRADE_TERM_OPTIONS: GradeTerm[] = ["1学期", "2学期", "3学期", "学年末"];

export function createEmptyGradeForm(): GradeFormState {
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

export function formScores(form: GradeFormState): ExamScores {
  return {
    midterm: parseScoreInput(form.midtermScore),
    final: parseScoreInput(form.finalScore),
  };
}

export function formFromGradeRecord(record: GradeRecord): GradeFormState {
  const scores = normalizeExamScores(record.scores);

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

export function gradeFormScoreNote(form: GradeFormState, gradingMethod: GradingMethod) {
  if (gradingMethod === "manual") {
    return "評定は自分で選べます。得点の入力は任意です。";
  }

  const scores = formScores(form);
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
}

export function applyGradeScoreInput(
  form: GradeFormState,
  key: "midtermScore" | "finalScore",
  value: string,
  gradingMethod: GradingMethod,
): GradeFormState {
  const next = { ...form, [key]: value };

  if (gradingMethod === "manual") {
    return next;
  }

  const autoGrade = gradeFromExamScores(formScores(next));
  return autoGrade === null ? next : { ...next, grade: autoGrade };
}

function createGradeId() {
  return createShinromiiId("grade");
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function buildGradeRecord(options: {
  form: GradeFormState;
  existing?: GradeRecord | null;
  gradingMethod: GradingMethod;
}): GradeRecord | null {
  if (!options.form.subject.trim()) {
    return null;
  }

  const now = todayString();
  const scores = formScores(options.form);
  const autoGrade =
    options.gradingMethod === "manual"
      ? null
      : gradeFromExamScores(scores, gradingProfiles[options.gradingMethod]);

  return {
    id: options.existing?.id ?? createGradeId(),
    schoolYear: options.form.schoolYear,
    term: options.form.term,
    subject: options.form.subject.trim(),
    grade: autoGrade ?? options.form.grade,
    memo: options.form.memo.trim(),
    createdAt: options.existing?.createdAt ?? now,
    updatedAt: now,
    ...(hasAnyExamScore(scores) ? { scores } : {}),
  };
}
