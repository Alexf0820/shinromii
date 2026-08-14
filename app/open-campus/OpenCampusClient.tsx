"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
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
      <SectionHeader
        title="オープンキャンパス"
        description="これから行く予定と参加済みを分けて確認"
      />

      <section className="panel">
        <SectionHeader
          title="これから行く予定"
          description="予約状況が見やすいカード表示"
        />
        <div className="list-stack">
          {campusUpcoming.map((item) => (
            <article key={item.id} className="list-card">
              <div className="row-between gap-sm align-start">
                <div>
                  <p className="item-title">{item.university}</p>
                  <p className="item-subtitle">{item.program}</p>
                </div>
                <span
                  className={`status-pill ${
                    item.status === "予約済み" ? "reserved" : "considering"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="detail-line">{item.date}</p>
              <p className="muted-text">{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          title="参加済み"
          description="評価を入力しつつ、あとで比較しやすい形に整理"
        />
        <div className="list-stack">
          {doneItems.map((item) => {
            const evaluation = item.mergedEvaluation;
            const isDetailOpen = detailId === item.id;
            const isEditing = editingId === item.id;

            return (
              <article key={item.id} className={`candidate-card ${isDetailOpen ? "selected-card" : ""}`}>
                <div className="row-between gap-sm align-start">
                  <div>
                    <p className="item-title">{item.university}</p>
                    <p className="item-subtitle">{item.program}</p>
                  </div>
                  <span className="status-pill done">
                    {evaluation.overall ? `★ ${evaluation.overall}` : "未評価"}
                  </span>
                </div>
                <p className="detail-line">{item.date}</p>

                <div className="feedback-grid">
                  <div className="feedback-card">
                    <p className="feedback-label">良かったところ</p>
                    <p>{evaluation.goodPoint || "まだ入力されていません"}</p>
                  </div>
                  <div className="feedback-card">
                    <p className="feedback-label">微妙だったところ</p>
                    <p>{evaluation.badPoint || "まだ入力されていません"}</p>
                  </div>
                </div>

                <div className="note-card">
                  <p className="feedback-label">本人の感想</p>
                  <p>{evaluation.studentComment || "まだ入力されていません"}</p>
                </div>

                <div className="action-row compact">
                  <button
                    type="button"
                    className="action-button subtle"
                    onClick={() => setDetailId(isDetailOpen ? null : item.id)}
                  >
                    {isDetailOpen ? "詳細を閉じる" : "詳細を見る"}
                  </button>
                  <button
                    type="button"
                    className="action-button subtle"
                    onClick={() => openEditor(item)}
                  >
                    {evaluation.overall || evaluation.goodPoint || evaluation.studentComment
                      ? "編集"
                      : "評価する"}
                  </button>
                </div>

                {isDetailOpen && (
                  <div className="detail-stack top-gap">
                    <div className="note-card">
                      <p className="feedback-label">家族の感想</p>
                      <p className="preserve-lines">
                        {evaluation.familyComment || "まだ入力されていません"}
                      </p>
                    </div>

                    <div className="note-card">
                      <p className="feedback-label">自由メモ</p>
                      <p className="preserve-lines">
                        {evaluation.freeNote || "まだ入力されていません"}
                      </p>
                    </div>

                    <div className="score-summary-grid">
                      {(
                        Object.entries(categoryLabels) as [CampusEvaluationCategory, string][]
                      ).map(([key, label]) => (
                        <div key={key} className="subject-chip">
                          <span>{label}</span>
                          <strong>{evaluation.categoryScores[key] ?? "-"}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="editor-card top-gap">
                    <div className="form-stack">
                      <ScoreSelector
                        label="総合評価"
                        value={form.overall}
                        onChange={(value) => updateField("overall", value)}
                      />

                      {(
                        Object.entries(categoryLabels) as [CampusEvaluationCategory, string][]
                      ).map(([key, label]) => (
                        <ScoreSelector
                          key={key}
                          label={label}
                          value={form.categoryScores[key]}
                          onChange={(value) => updateCategory(key, value)}
                        />
                      ))}

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
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
