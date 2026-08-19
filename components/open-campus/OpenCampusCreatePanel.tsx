"use client";

import { useState } from "react";
import { CampusEvaluationForm } from "@/components/open-campus/CampusEvaluationForm";
import { SectionHeader } from "@/components/SectionHeader";
import type { CampusEvaluation, OpenCampusEvent } from "@/data/mockData";
import {
  applyCreateIntent,
  buildOpenCampusEventFromForm,
  createEmptyEventForm,
  type OpenCampusCreateIntent,
} from "@/lib/oc-form";
import { createEmptyEvaluation, normalizeCampusEvaluation, OC_LOOK_FOR_OPTIONS, toggleIdList } from "@/lib/oc-record";

type OpenCampusCreatePanelProps = {
  events: OpenCampusEvent[];
  evaluations: Record<string, CampusEvaluation>;
  onEventsChange: (next: OpenCampusEvent[]) => void;
  onEvaluationsChange: (next: Record<string, CampusEvaluation>) => void;
};

export function OpenCampusCreatePanel({
  events,
  evaluations,
  onEventsChange,
  onEvaluationsChange,
}: OpenCampusCreatePanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [createIntent, setCreateIntent] = useState<OpenCampusCreateIntent>("upcoming");
  const [eventForm, setEventForm] = useState(createEmptyEventForm);
  const [pendingEvalId, setPendingEvalId] = useState<string | null>(null);
  const [evalOpen, setEvalOpen] = useState(false);
  const [evaluationForm, setEvaluationForm] = useState<CampusEvaluation>(createEmptyEvaluation);

  function openForm(intent: OpenCampusCreateIntent) {
    setCreateIntent(intent);
    setEventForm(applyCreateIntent(createEmptyEventForm(), intent));
    setShowForm(true);
    setPendingEvalId(null);
    setEvalOpen(false);
  }

  function updateEventForm<K extends keyof typeof eventForm>(key: K, value: (typeof eventForm)[K]) {
    setEventForm((current) => ({ ...current, [key]: value }));
  }

  function handleSaveEvent() {
    const nextEvent = buildOpenCampusEventFromForm(eventForm);

    if (!nextEvent) {
      window.alert("大学名を入力してください。");
      return;
    }

    onEventsChange([nextEvent, ...events]);
    setShowForm(false);
    setEventForm(createEmptyEventForm());

    if (nextEvent.status === "参加済み") {
      setPendingEvalId(nextEvent.id);
      setEvalOpen(false);
      setEvaluationForm(createEmptyEvaluation());
    } else {
      setPendingEvalId(null);
      setEvalOpen(false);
    }
  }

  function handleSaveEvaluation() {
    if (!pendingEvalId) {
      return;
    }

    onEvaluationsChange({
      ...evaluations,
      [pendingEvalId]: normalizeCampusEvaluation(evaluationForm),
    });
    setPendingEvalId(null);
    setEvalOpen(false);
    setEvaluationForm(createEmptyEvaluation());
  }

  const isDoneCreate = createIntent === "done";

  return (
    <div className="setup-oc-panel">
      {events.length > 0 ? (
        <ul className="setup-mini-list">
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.university}</strong>
              <span>
                {event.status}
                {event.eventDate ? ` · ${event.eventDate.replaceAll("-", "/")}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {!showForm && !evalOpen ? (
        <div className="setup-choice-row">
          <button type="button" className="setup-choice-button" onClick={() => openForm("upcoming")}>
            これから参加
          </button>
          <button type="button" className="setup-choice-button" onClick={() => openForm("done")}>
            参加済み
          </button>
        </div>
      ) : null}

      {showForm ? (
        <section className="panel inline-detail-card inline-editor-card">
          <SectionHeader
            title="オープンキャンパスを追加"
            description="これから参加するOCも、すでに参加したOCも記録できます"
          />
          <div className="form-stack">
            <div className="field-block">
              <span className="field-label">このOCは？</span>
              <div className="oc-intent-toggle">
                <button
                  type="button"
                  className={`choice-chip oc-choice-chip ${createIntent === "upcoming" ? "active" : ""}`}
                  aria-pressed={createIntent === "upcoming"}
                  onClick={() => {
                    setCreateIntent("upcoming");
                    setEventForm((current) => applyCreateIntent(current, "upcoming"));
                  }}
                >
                  これから参加
                </button>
                <button
                  type="button"
                  className={`choice-chip oc-choice-chip ${createIntent === "done" ? "active" : ""}`}
                  aria-pressed={createIntent === "done"}
                  onClick={() => {
                    setCreateIntent("done");
                    setEventForm((current) => applyCreateIntent(current, "done"));
                  }}
                >
                  参加済み
                </button>
              </div>
            </div>

            <div className="field-grid">
              <label className="field-block">
                <span className="field-label">大学名</span>
                <input
                  className="text-input"
                  type="text"
                  value={eventForm.university}
                  onChange={(event) => updateEventForm("university", event.target.value)}
                />
              </label>
              <label className="field-block">
                <span className="field-label">学部・学科（任意）</span>
                <input
                  className="text-input"
                  type="text"
                  value={eventForm.facultyDepartment}
                  onChange={(event) => updateEventForm("facultyDepartment", event.target.value)}
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="field-block">
                <span className="field-label">イベント名</span>
                <input
                  className="text-input"
                  type="text"
                  value={eventForm.eventName}
                  onChange={(event) => updateEventForm("eventName", event.target.value)}
                  placeholder="例: オープンキャンパス"
                />
              </label>
              <label className="field-block">
                <span className="field-label">{isDoneCreate ? "参加日" : "開催日"}</span>
                <input
                  className="text-input"
                  type="date"
                  value={eventForm.eventDate}
                  onChange={(event) => updateEventForm("eventDate", event.target.value)}
                />
              </label>
            </div>

            <details className="oc-detail-fold">
              <summary className="oc-detail-fold-summary">時間・当日メモ（任意）</summary>
              <div className="form-stack top-gap">
                <div className="field-grid">
                  <label className="field-block">
                    <span className="field-label">開始時間</span>
                    <input
                      className="text-input"
                      type="time"
                      value={eventForm.startTime}
                      onChange={(event) => updateEventForm("startTime", event.target.value)}
                    />
                  </label>
                  <label className="field-block">
                    <span className="field-label">終了時間</span>
                    <input
                      className="text-input"
                      type="time"
                      value={eventForm.endTime}
                      onChange={(event) => updateEventForm("endTime", event.target.value)}
                    />
                  </label>
                </div>
                <div className="field-block">
                  <span className="field-label">今回、見ておきたいこと（任意）</span>
                  <div className="choice-chips oc-choice-chips">
                    {OC_LOOK_FOR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`choice-chip oc-choice-chip ${eventForm.lookFor.includes(option.id) ? "active" : ""}`}
                        aria-pressed={eventForm.lookFor.includes(option.id)}
                        onClick={() => updateEventForm("lookFor", toggleIdList(eventForm.lookFor, option.id))}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="field-block">
                  <span className="field-label">当日のメモ（任意）</span>
                  <textarea
                    className="text-area"
                    rows={3}
                    value={eventForm.dayMemo}
                    onChange={(event) => updateEventForm("dayMemo", event.target.value)}
                  />
                </label>
              </div>
            </details>

            <div className="action-row">
              <button type="button" className="action-button primary" onClick={handleSaveEvent}>
                保存する
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => {
                  setShowForm(false);
                  setEventForm(createEmptyEventForm());
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {pendingEvalId && !evalOpen ? (
        <div className="oc-attend-prompt oc-eval-invite">
          <p className="oc-attend-prompt-title">登録しました。続けて評価しますか？</p>
          <div className="oc-attend-actions">
            <button type="button" className="card-action primary" onClick={() => setEvalOpen(true)}>
              30秒で評価する
            </button>
            <button type="button" className="card-action subtle oc-attend-later" onClick={() => setPendingEvalId(null)}>
              あとで
            </button>
          </div>
        </div>
      ) : null}

      {pendingEvalId && evalOpen ? (
        <CampusEvaluationForm
          value={evaluationForm}
          onChange={setEvaluationForm}
          onSave={handleSaveEvaluation}
          onCancel={() => {
            setEvalOpen(false);
            setPendingEvalId(null);
          }}
        />
      ) : null}
    </div>
  );
}
