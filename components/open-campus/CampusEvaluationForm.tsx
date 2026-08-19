"use client";

import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
import type { CampusEvaluation, OcPointTagId, OcSimpleMark } from "@/data/mockData";
import {
  OC_ACCESS_MARK_LABELS,
  OC_ASPIRATION_OPTIONS,
  OC_CAMPUS_MARK_LABELS,
  OC_LEARNING_MARK_LABELS,
  OC_POINT_TAG_OPTIONS,
  OC_SIMPLE_MARKS,
  OC_STUDENT_MARK_LABELS,
  toggleIdList,
} from "@/lib/oc-record";

type CampusEvaluationFormProps = {
  value: CampusEvaluation;
  onChange: (next: CampusEvaluation) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function CampusEvaluationForm({ value, onChange, onSave, onCancel }: CampusEvaluationFormProps) {
  const goodTags = value.goodTags ?? [];
  const concernTags = value.concernTags ?? [];

  function update<K extends keyof CampusEvaluation>(key: K, next: CampusEvaluation[K]) {
    onChange({ ...value, [key]: next });
  }

  function updateSimpleRating(key: "campus" | "students" | "learning" | "access", mark: OcSimpleMark) {
    const current = value.simpleRatings ?? {};
    onChange({
      ...value,
      simpleRatings: {
        ...current,
        [key]: current[key] === mark ? undefined : mark,
      },
    });
  }

  function renderMarkButtons(
    labels: Record<OcSimpleMark, string>,
    selected: OcSimpleMark | undefined,
    onSelect: (mark: OcSimpleMark) => void,
  ) {
    return (
      <div className="oc-simple-rating">
        {OC_SIMPLE_MARKS.map((mark) => (
          <button
            key={mark}
            type="button"
            className={`oc-simple-rating-btn ${selected === mark ? "active" : ""}`}
            aria-pressed={selected === mark}
            onClick={() => onSelect(mark)}
          >
            {labels[mark]}
          </button>
        ))}
      </div>
    );
  }

  function renderTagButtons(selected: OcPointTagId[], onToggle: (id: OcPointTagId) => void) {
    return (
      <div className="choice-chips oc-choice-chips">
        {OC_POINT_TAG_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`choice-chip oc-choice-chip ${selected.includes(option.id) ? "active" : ""}`}
            aria-pressed={selected.includes(option.id)}
            onClick={() => onToggle(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <section className="panel inline-detail-card inline-editor-card oc-eval-editor">
      <SectionHeader title="OCどうだった？" description="選ぶだけで残せます。全部空でも保存できます。" />
      <div className="form-stack">
        <ScoreSelector label="総合評価" value={value.overall} onChange={(overall) => update("overall", overall)} />

        <div className="field-block">
          <span className="field-label">校舎・設備</span>
          {renderMarkButtons(OC_CAMPUS_MARK_LABELS, value.simpleRatings?.campus, (mark) =>
            updateSimpleRating("campus", mark),
          )}
        </div>
        <div className="field-block">
          <span className="field-label">学生の雰囲気</span>
          {renderMarkButtons(OC_STUDENT_MARK_LABELS, value.simpleRatings?.students, (mark) =>
            updateSimpleRating("students", mark),
          )}
        </div>
        <div className="field-block">
          <span className="field-label">授業・学び</span>
          {renderMarkButtons(OC_LEARNING_MARK_LABELS, value.simpleRatings?.learning, (mark) =>
            updateSimpleRating("learning", mark),
          )}
        </div>
        <div className="field-block">
          <span className="field-label">通いやすさ</span>
          {renderMarkButtons(OC_ACCESS_MARK_LABELS, value.simpleRatings?.access, (mark) =>
            updateSimpleRating("access", mark),
          )}
        </div>

        <div className="field-block">
          <span className="field-label">今の志望度</span>
          <div className="choice-chips oc-choice-chips">
            {OC_ASPIRATION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`choice-chip oc-choice-chip ${value.aspiration === option.id ? "active" : ""}`}
                aria-pressed={value.aspiration === option.id}
                onClick={() => update("aspiration", value.aspiration === option.id ? undefined : option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-block">
          <span className="field-label">良かったところ</span>
          {renderTagButtons(goodTags, (id) => update("goodTags", toggleIdList(goodTags, id)))}
        </div>
        <div className="field-block">
          <span className="field-label">気になったところ</span>
          {renderTagButtons(concernTags, (id) => update("concernTags", toggleIdList(concernTags, id)))}
        </div>

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
