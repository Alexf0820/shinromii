import { isValidGrade } from "@/lib/reference-grades";
import type { GradeRecord, GradeSchoolYear, GradeTerm } from "@/data/mockData";
import { createShinromiiId } from "@/lib/shinromii-id";
import {
  hasAnyExamScore,
  normalizeExamScores,
  type ExamScores,
  type GradingMethod,
} from "@/lib/grading-rule";

export type GradeFormState = {
  schoolYear: GradeSchoolYear;
  term: GradeTerm;
  subject: string;
  grade: number | "";
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
    grade: "",
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
    grade: isValidGrade(record.grade) ? record.grade : "",
    memo: record.memo,
    midtermScore: scores?.midterm === null || scores?.midterm === undefined ? "" : String(scores.midterm),
    finalScore: scores?.final === null || scores?.final === undefined ? "" : String(scores.final),
  };
}

export function gradeFormScoreNote(_form: GradeFormState, _gradingMethod: GradingMethod) {
  return "学校から示された評定を選んでください。得点は記録用で、評定は自動変更しません。";
}

export function applyGradeScoreInput(form: GradeFormState, key: "midtermScore" | "finalScore", value: string, _gradingMethod: GradingMethod): GradeFormState {
  return { ...form, [key]: value };
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
  if (!options.form.subject.trim() || !isValidGrade(options.form.grade)) {
    return null;
  }

  const now = todayString();
  const scores = formScores(options.form);

  return {
    id: options.existing?.id ?? createGradeId(),
    schoolYear: options.form.schoolYear,
    term: options.form.term,
    subject: options.form.subject.trim(),
    grade: options.form.grade,
    memo: options.form.memo.trim(),
    createdAt: options.existing?.createdAt ?? now,
    updatedAt: now,
    ...(hasAnyExamScore(scores) ? { scores } : {}),
  };
}
