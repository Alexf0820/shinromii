"use client";

import { SectionHeader } from "@/components/SectionHeader";
import type { EikenCefr, QualificationStatus } from "@/data/mockData";
import { EIKEN_CEFR_LEVELS, isEikenQualificationName } from "@/lib/eiken";
import {
  QUALIFICATION_STATUS_OPTIONS,
  type QualificationFormState,
} from "@/lib/qualification-form";

type QualificationRecordFormProps = {
  title: string;
  description: string;
  form: QualificationFormState;
  onChange: (next: QualificationFormState) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function QualificationRecordForm({
  title,
  description,
  form,
  onChange,
  onSave,
  onCancel,
}: QualificationRecordFormProps) {
  function update<K extends keyof QualificationFormState>(key: K, value: QualificationFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <section className="panel inline-detail-card inline-editor-card">
      <SectionHeader title={title} description={description} />
      <div className="form-stack">
        <div className="field-grid">
          <label className="field-block">
            <span className="field-label">資格名</span>
            <input
              className="text-input"
              type="text"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">級・スコア</span>
            <input
              className="text-input"
              type="text"
              value={form.scoreOrLevel}
              onChange={(event) => update("scoreOrLevel", event.target.value)}
            />
          </label>
        </div>

        <div className="field-grid">
          <label className="field-block">
            <span className="field-label">取得日または受験日（任意）</span>
            <input
              className="text-input"
              type="date"
              value={form.examDate}
              onChange={(event) => update("examDate", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">状態</span>
            <select
              className="text-input"
              value={form.status}
              onChange={(event) => update("status", event.target.value as QualificationStatus)}
            >
              {QUALIFICATION_STATUS_OPTIONS.map((option) => (
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
            value={form.memo}
            onChange={(event) => update("memo", event.target.value)}
          />
        </label>

        {isEikenQualificationName(form.name) ? (
          <div className="eiken-score-fold">
            <p className="eiken-score-summary">英検スコア（任意）</p>
            <div className="eiken-score-grid">
              <label className="field-block eiken-score-cse">
                <span className="field-label">CSEスコア</span>
                <input
                  className="text-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.cseScore}
                  onChange={(event) => update("cseScore", event.target.value)}
                />
              </label>
              <label className="field-block eiken-score-cse">
                <span className="field-label">CEFR（任意）</span>
                <select
                  className="text-input"
                  value={form.cefr}
                  onChange={(event) => update("cefr", event.target.value as "" | EikenCefr)}
                >
                  <option value="">選択しない</option>
                  {EIKEN_CEFR_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-block">
                <span className="field-label">Reading</span>
                <input
                  className="text-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.readingScore}
                  onChange={(event) => update("readingScore", event.target.value)}
                />
              </label>
              <label className="field-block">
                <span className="field-label">Listening</span>
                <input
                  className="text-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.listeningScore}
                  onChange={(event) => update("listeningScore", event.target.value)}
                />
              </label>
              <label className="field-block">
                <span className="field-label">Writing</span>
                <input
                  className="text-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.writingScore}
                  onChange={(event) => update("writingScore", event.target.value)}
                />
              </label>
              <label className="field-block">
                <span className="field-label">Speaking</span>
                <input
                  className="text-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.speakingScore}
                  onChange={(event) => update("speakingScore", event.target.value)}
                />
              </label>
            </div>
          </div>
        ) : null}

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
