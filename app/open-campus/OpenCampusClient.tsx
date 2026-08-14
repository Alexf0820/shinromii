"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
import { UiIcon } from "@/components/UiIcon";
import { campusDone as initialDone, campusUpcoming } from "@/data/mockData";
import type {
  CampusEvaluation,
  CampusEvaluationCategory,
  CampusVisit,
} from "@/data/mockData";
import {
  loadShinromiiStorage,
  saveCampusEvaluation,
} from "@/lib/shinromii-storage";

const categoryLabels: Record<CampusEvaluationCategory, string> = {
  atmosphere: "校舎・雰囲気",
  curriculum: "学びたい内容",
  students: "学生の印象",
  access: "通いやすさ",
  career: "就職・将来性",
};

function createEmptyEvaluation(): CampusEvaluation {
  return {
    overall: null,
    goodPoint: "",
    badPoint: "",
    studentComment: "",
    familyComment: "",
    freeNote: "",
    categoryScores: {
      atmosphere: null,
      curriculum: null,
      students: null,
      access: null,
      career: null,
    },
  };
}

function mergeEvaluation(item: CampusVisit, evaluations: Record<string, CampusEvaluation>) {
  return evaluations[item.id] ?? item.evaluation ?? createEmptyEvaluation();
}

function renderStars(score: number | null) {
  return (
    <span className="stars" aria-label={score ? `評価 ${score} / 5` : "未評価"}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} className={score && value <= score ? "" : "star-muted"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function OpenCampusClient() {
  const [evaluations, setEvaluations] = useState<Record<string, CampusEvaluation>>({});
  const [detailId, setDetailId] = useState<string | null>(initialDone[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampusEvaluation>(createEmptyEvaluation());

  useEffect(() => {
    const stored = loadShinromiiStorage().campusEvaluations;
    setEvaluations(stored);
  }, []);

  const doneItems = useMemo(
    () =>
      initialDone.map((item) => ({
        ...item,
        mergedEvaluation: mergeEvaluation(item, evaluations),
      })),
    [evaluations],
  );

  const selectedDoneItem = doneItems.find((item) => item.id === detailId) ?? null;

  function openEditor(item: CampusVisit) {
    setEditingId(item.id);
    setDetailId(item.id);
    setForm(mergeEvaluation(item, evaluations));
  }

  function closeEditor() {
    setEditingId(null);
    setForm(createEmptyEvaluation());
  }

  function updateField<K extends keyof CampusEvaluation>(key: K, value: CampusEvaluation[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateCategory(category: CampusEvaluationCategory, value: number | null) {
    setForm((current) => ({
      ...current,
      categoryScores: {
        ...current.categoryScores,
        [category]: value,
      },
    }));
  }

  function handleSave() {
    if (!editingId) {
      return;
    }

    const nextEvaluation: CampusEvaluation = {
      overall: form.overall,
      goodPoint: form.goodPoint.trim(),
      badPoint: form.badPoint.trim(),
      studentComment: form.studentComment.trim(),
      familyComment: form.familyComment.trim(),
      freeNote: form.freeNote.trim(),
      categoryScores: form.categoryScores,
    };

    const nextEvaluations = {
      ...evaluations,
      [editingId]: nextEvaluation,
    };

    setEvaluations(nextEvaluations);
    saveCampusEvaluation(editingId, nextEvaluation);
    closeEditor();
  }

  return (
    <div className="page-stack">
      <section className="page-hero tone-campus">
        <div className="page-hero-copy">
          <p className="eyebrow">オープンキャンパス</p>
          <h2 className="hero-title">これから行く予定と、参加後の感想を分けて整理。</h2>
          <p className="hero-description">
            予定は準備しやすく、参加済みは比較しやすく見返せるレイアウトに整えます。
          </p>
          <div className="hero-stats-inline">
            <span className="hero-stat-chip">
              <strong>{campusUpcoming.length}件</strong>
              <span className="item-subtitle">参加予定</span>
            </span>
            <span className="hero-stat-chip">
              <strong>{doneItems.length}件</strong>
              <span className="item-subtitle">参加済み</span>
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHeader title="これから行く予定" description="予定を先にまとめて確認" />
        <div className="list-stack">
          {campusUpcoming.map((item) => (
            <article key={item.id} className="list-card campus-card tone-campus">
              <div className="list-card-header">
                <div className="candidate-main">
                  <span className="candidate-icon-badge">
                    <UiIcon name="campus" className="list-item-icon" />
                  </span>
                  <div className="candidate-summary">
                    <p className="item-title">{item.university}</p>
                    <p className="item-subtitle">{item.program}</p>
                  </div>
                </div>
                <span
                  className={`status-pill ${
                    item.status === "予約済み" ? "reserved" : "considering"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <div className="qualification-meta">
                <span className="mini-badge">{item.date}</span>
              </div>
              <p className="muted-text">{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionHeader title="参加済み" description="評価と感想を比較しやすく表示" />
        <div className="list-stack">
          {doneItems.map((item) => {
            const evaluation = item.mergedEvaluation;

            return (
              <article
                key={item.id}
                className={`candidate-card tone-campus ${detailId === item.id ? "selected-card" : ""}`}
              >
                <div className="candidate-topline">
                  <div className="candidate-main">
                    <span className="candidate-icon-badge">
                      <UiIcon name="campus" className="list-item-icon" />
                    </span>
                    <div className="candidate-summary">
                      <p className="item-title">{item.university}</p>
                      <p className="item-subtitle">{item.program}</p>
                    </div>
                  </div>
                  <span className={`status-pill ${evaluation.overall ? "done" : "considering"}`}>
                    {evaluation.overall ? `総合 ${evaluation.overall}` : "未評価"}
                  </span>
                </div>

                <div className="summary-line">
                  {renderStars(evaluation.overall)}
                  <span className="mini-badge">{item.date}</span>
                </div>

                <div className="note-card">
                  <p className="feedback-label">良かったところ</p>
                  <p>{evaluation.goodPoint || "まだ入力されていません"}</p>
                </div>

                <div className="list-actions">
                  <button
                    type="button"
                    className="card-action subtle"
                    onClick={() => setDetailId(item.id)}
                  >
                    <UiIcon name="detail" className="action-icon" />
                    詳細
                  </button>
                  <button
                    type="button"
                    className="card-action subtle"
                    onClick={() => openEditor(item)}
                  >
                    <UiIcon name="edit" className="action-icon" />
                    {evaluation.overall || evaluation.goodPoint || evaluation.studentComment
                      ? "編集"
                      : "評価する"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedDoneItem && (
        <section className="detail-card">
          <div className="detail-section-header">
            <div>
              <p className="eyebrow">参加済み詳細</p>
              <p className="item-title">{selectedDoneItem.university}</p>
              <p className="item-subtitle">{selectedDoneItem.program}</p>
            </div>
            <div className="score-display">
              {renderStars(selectedDoneItem.mergedEvaluation.overall)}
            </div>
          </div>

          <div className="detail-section-list top-gap">
            <section className="detail-section">
              <p className="feedback-label">基本情報</p>
              <div className="detail-entry top-gap">
                <span className="detail-entry-label">大学名</span>
                <span className="detail-entry-value">{selectedDoneItem.university}</span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">内容</span>
                <span className="detail-entry-value">{selectedDoneItem.program}</span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">日時</span>
                <span className="detail-entry-value">{selectedDoneItem.date}</span>
              </div>
            </section>

            <section className="detail-section">
              <p className="feedback-label">評価</p>
              <div className="detail-entry top-gap">
                <span className="detail-entry-label">総合評価</span>
                <span className="detail-entry-value">
                  {selectedDoneItem.mergedEvaluation.overall
                    ? `${selectedDoneItem.mergedEvaluation.overall} / 5`
                    : "未評価"}
                </span>
              </div>
              {(Object.entries(categoryLabels) as [CampusEvaluationCategory, string][]).map(
                ([key, label]) => (
                  <div key={key} className="detail-entry">
                    <span className="detail-entry-label">{label}</span>
                    <span className="detail-entry-value">
                      {selectedDoneItem.mergedEvaluation.categoryScores[key] ?? "-"}
                    </span>
                  </div>
                ),
              )}
            </section>

            <section className="detail-section">
              <p className="feedback-label">メモ</p>
              <div className="detail-entry top-gap">
                <span className="detail-entry-label">良かった</span>
                <span className="detail-entry-value preserve-lines">
                  {selectedDoneItem.mergedEvaluation.goodPoint || "まだ入力されていません"}
                </span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">微妙だった</span>
                <span className="detail-entry-value preserve-lines">
                  {selectedDoneItem.mergedEvaluation.badPoint || "まだ入力されていません"}
                </span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">本人感想</span>
                <span className="detail-entry-value preserve-lines">
                  {selectedDoneItem.mergedEvaluation.studentComment || "まだ入力されていません"}
                </span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">家族感想</span>
                <span className="detail-entry-value preserve-lines">
                  {selectedDoneItem.mergedEvaluation.familyComment || "まだ入力されていません"}
                </span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">自由メモ</span>
                <span className="detail-entry-value preserve-lines">
                  {selectedDoneItem.mergedEvaluation.freeNote || "まだ入力されていません"}
                </span>
              </div>
            </section>
          </div>

          {editingId === selectedDoneItem.id && (
            <div className="editor-card top-gap">
              <div className="form-stack">
                <ScoreSelector
                  label="総合評価"
                  value={form.overall}
                  onChange={(value) => updateField("overall", value)}
                />

                {(Object.entries(categoryLabels) as [CampusEvaluationCategory, string][]).map(
                  ([key, label]) => (
                    <ScoreSelector
                      key={key}
                      label={label}
                      value={form.categoryScores[key]}
                      onChange={(value) => updateCategory(key, value)}
                    />
                  ),
                )}

                <label className="field-block">
                  <span className="field-label">良かったところ</span>
                  <textarea
                    className="text-area"
                    rows={3}
                    value={form.goodPoint}
                    onChange={(event) => updateField("goodPoint", event.target.value)}
                  />
                </label>

                <label className="field-block">
                  <span className="field-label">微妙だったところ</span>
                  <textarea
                    className="text-area"
                    rows={3}
                    value={form.badPoint}
                    onChange={(event) => updateField("badPoint", event.target.value)}
                  />
                </label>

                <label className="field-block">
                  <span className="field-label">本人の感想</span>
                  <textarea
                    className="text-area"
                    rows={4}
                    value={form.studentComment}
                    onChange={(event) => updateField("studentComment", event.target.value)}
                  />
                </label>

                <label className="field-block">
                  <span className="field-label">家族の感想</span>
                  <textarea
                    className="text-area"
                    rows={4}
                    value={form.familyComment}
                    onChange={(event) => updateField("familyComment", event.target.value)}
                  />
                </label>

                <label className="field-block">
                  <span className="field-label">自由メモ</span>
                  <textarea
                    className="text-area"
                    rows={3}
                    value={form.freeNote}
                    onChange={(event) => updateField("freeNote", event.target.value)}
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
            </div>
          )}
        </section>
      )}
    </div>
  );
}
