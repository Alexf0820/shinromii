"use client";

import { SectionHeader } from "@/components/SectionHeader";
import type { GradeSchoolYear, GradeTerm } from "@/data/mockData";
import {
  applyGradeScoreInput,
  GRADE_SCHOOL_YEAR_OPTIONS,
  GRADE_TERM_OPTIONS,
  gradeFormScoreNote,
  type GradeFormState,
} from "@/lib/grade-form";
import type { GradingMethod } from "@/lib/grading-rule";

type GradeRecordFormProps = {
  title: string;
  description: string;
  form: GradeFormState;
  onChange: (next: GradeFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  gradingMethod?: GradingMethod;
};

export function GradeRecordForm({
  title,
  description,
  form,
  onChange,
  onSave,
  onCancel,
  gradingMethod = "school-rule-a",
}: GradeRecordFormProps) {
  const scoreNote = gradeFormScoreNote(form, gradingMethod);

  function update<K extends keyof GradeFormState>(key: K, value: GradeFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <section className="panel inline-detail-card inline-editor-card">
      <SectionHeader title={title} description={description} />
      <div className="form-stack">
        <div className="field-grid">
          <label className="field-block">
            <span className="field-label">学年</span>
            <select
              className="text-input"
              value={form.schoolYear}
              onChange={(event) => update("schoolYear", event.target.value as GradeSchoolYear)}
            >
              {GRADE_SCHOOL_YEAR_OPTIONS.map((option) => (
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
              value={form.term}
              onChange={(event) => update("term", event.target.value as GradeTerm)}
            >
              {GRADE_TERM_OPTIONS.map((option) => (
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
              value={form.subject}
              onChange={(event) => update("subject", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">評定</span>
            <select
              className="text-input"
              value={form.grade}
              onChange={(event) => update("grade", Number(event.target.value))}
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
              value={form.midtermScore}
              onChange={(event) =>
                onChange(applyGradeScoreInput(form, "midtermScore", event.target.value, gradingMethod))
              }
            />
          </label>

          <label className="field-block">
            <span className="field-label">期末</span>
            <input
              className="text-input"
              type="number"
              inputMode="numeric"
              value={form.finalScore}
              onChange={(event) =>
                onChange(applyGradeScoreInput(form, "finalScore", event.target.value, gradingMethod))
              }
            />
          </label>
        </div>

        <p className="field-help">{scoreNote}</p>

        <label className="field-block">
          <span className="field-label">メモ（任意）</span>
          <textarea
            className="text-area"
            rows={3}
            value={form.memo}
            onChange={(event) => update("memo", event.target.value)}
          />
        </label>

        <div className="action-row">
          <button type="button" className="action-button primary" onClick={onSave}>
            保存する
          </button>
          <button type="button" className="action-button" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </section>
  );
}
