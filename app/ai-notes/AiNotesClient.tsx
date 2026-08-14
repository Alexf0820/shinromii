"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
import { aiNotes as initialAiNotes } from "@/data/mockData";
import type { AiNote, AiProvider } from "@/data/mockData";
import {
  loadAiNotesSortOrder,
  loadShinromiiStorage,
  saveAiNotes,
  saveAiNotesSortOrder,
} from "@/lib/shinromii-storage";
import type { AiNotesSortOrder } from "@/lib/shinromii-storage";

const providerOptions: AiProvider[] = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "NotebookLM",
  "その他",
];

type FormState = {
  consultedAt: string;
  provider: AiProvider;
  title: string;
  consultationBody: string;
  answerBody: string;
  summary: string;
  relatedSchool: string;
  helpful: number | null;
  freeNote: string;
};

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `ai-note-${Date.now()}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(): FormState {
  return {
    consultedAt: todayString(),
    provider: "ChatGPT",
    title: "",
    consultationBody: "",
    answerBody: "",
    summary: "",
    relatedSchool: "",
    helpful: 3,
    freeNote: "",
  };
}

function formFromNote(note: AiNote): FormState {
  return {
    consultedAt: note.consultedAt,
    provider: note.provider,
    title: note.title,
    consultationBody: note.consultationBody,
    answerBody: note.answerBody,
    summary: note.summary,
    relatedSchool: note.relatedSchool,
    helpful: note.helpful,
    freeNote: note.freeNote,
  };
}

function shorten(text: string, length: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > length ? `${normalized.slice(0, length)}...` : normalized;
}

export function AiNotesClient() {
  const [notes, setNotes] = useState<AiNote[]>(initialAiNotes);
  const [selectedId, setSelectedId] = useState<string | null>(initialAiNotes[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<FormState>(createEmptyForm());
  const [sortOrder, setSortOrder] = useState<AiNotesSortOrder>("newest");

  useEffect(() => {
    const stored = loadShinromiiStorage().aiNotes;
    setNotes(stored);
    setSelectedId(stored[0]?.id ?? null);
    setSortOrder(loadAiNotesSortOrder());
  }, []);

  const selectedNote = useMemo(
    () => notes.find((item) => item.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const sortedNotes = useMemo(() => {
    const next = [...notes];

    if (sortOrder === "oldest") {
      return next.sort((a, b) => a.consultedAt.localeCompare(b.consultedAt));
    }

    if (sortOrder === "helpful") {
      return next.sort((a, b) => {
        if (b.helpful !== a.helpful) {
          return b.helpful - a.helpful;
        }

        return b.consultedAt.localeCompare(a.consultedAt);
      });
    }

    return next.sort((a, b) => b.consultedAt.localeCompare(a.consultedAt));
  }, [notes, sortOrder]);

  const formTitle = isCreating ? "相談メモを追加" : "相談メモを編集";

  function openCreate() {
    setIsCreating(true);
    setEditingId(null);
    setForm(createEmptyForm());
  }

  function openEdit(note: AiNote) {
    setIsCreating(false);
    setEditingId(note.id);
    setSelectedId(note.id);
    setForm(formFromNote(note));
  }

  function closeEditor() {
    setIsCreating(false);
    setEditingId(null);
    setForm(createEmptyForm());
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSave() {
    if (!form.title.trim() || !form.answerBody.trim() || !form.summary.trim()) {
      window.alert("タイトル、AIの回答全文、要約メモは入力してください。");
      return;
    }

    const nextNote: AiNote = {
      id: editingId ?? createId(),
      consultedAt: form.consultedAt,
      provider: form.provider,
      title: form.title.trim(),
      consultationBody: form.consultationBody.trim(),
      answerBody: form.answerBody,
      summary: form.summary.trim(),
      relatedSchool: form.relatedSchool.trim(),
      helpful: form.helpful ?? 3,
      freeNote: form.freeNote.trim(),
    };

    const nextNotes = editingId
      ? notes.map((item) => (item.id === editingId ? nextNote : item))
      : [nextNote, ...notes];

    setNotes(nextNotes);
    setSelectedId(nextNote.id);
    saveAiNotes(nextNotes);
    closeEditor();
  }

  function handleDelete(note: AiNote) {
    const confirmed = window.confirm(`「${note.title}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    const nextNotes = notes.filter((item) => item.id !== note.id);
    setNotes(nextNotes);
    saveAiNotes(nextNotes);

    if (selectedId === note.id) {
      setSelectedId(nextNotes[0]?.id ?? null);
    }

    if (editingId === note.id) {
      closeEditor();
    }
  }

  function handleSortChange(nextSortOrder: AiNotesSortOrder) {
    setSortOrder(nextSortOrder);
    saveAiNotesSortOrder(nextSortOrder);
  }

  return (
    <div className="page-stack">
      <SectionHeader
        title="AI相談メモ"
        description="外部AIで相談した進路の内容を整理して保存する場所"
      />

      <section className="panel">
        <div className="form-stack">
          <button type="button" className="cta-button" onClick={openCreate}>
            <span className="cta-icon" aria-hidden="true">
              +
            </span>
            <span className="cta-copy">
              <strong>相談を追加する</strong>
              <small>新しい相談メモを作成</small>
            </span>
          </button>

          <div className="row-between gap-sm align-start">
            <div className="compare-header no-margin">
              <span className="soft-pill">localStorage 保存</span>
              <p className="muted-text">
                一覧から詳細確認、追加・編集・削除までできます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {(isCreating || editingId) && (
        <section className="panel">
          <SectionHeader title={formTitle} description="長文回答もそのまま貼り付けて保存できます" />
          <div className="form-stack">
            <div className="field-grid">
              <label className="field-block">
                <span className="field-label">相談日</span>
                <input
                  className="text-input"
                  type="date"
                  value={form.consultedAt}
                  onChange={(event) => updateForm("consultedAt", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">相談先</span>
                <select
                  className="text-input"
                  value={form.provider}
                  onChange={(event) => updateForm("provider", event.target.value as AiProvider)}
                >
                  {providerOptions.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field-block">
              <span className="field-label">タイトル / 相談テーマ</span>
              <input
                className="text-input"
                type="text"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="例: 文系寄りでも学びやすい情報系学部"
              />
            </label>

            <label className="field-block">
              <span className="field-label">相談した内容</span>
              <textarea
                className="text-area"
                rows={6}
                value={form.consultationBody}
                onChange={(event) => updateForm("consultationBody", event.target.value)}
                placeholder="AIに送った相談内容を貼り付け"
              />
            </label>

            <label className="field-block">
              <span className="field-label">AIの回答全文</span>
              <textarea
                className="text-area text-area-large"
                rows={14}
                value={form.answerBody}
                onChange={(event) => updateForm("answerBody", event.target.value)}
                placeholder="長文でもそのまま貼り付けて保存"
              />
              <span className="field-help">{form.answerBody.length.toLocaleString()} 文字</span>
            </label>

            <label className="field-block">
              <span className="field-label">要約メモ</span>
              <textarea
                className="text-area"
                rows={4}
                value={form.summary}
                onChange={(event) => updateForm("summary", event.target.value)}
                placeholder="一覧で見返しやすい短めの要約"
              />
            </label>

            <label className="field-block">
              <span className="field-label">関連する大学・学部（任意）</span>
              <input
                className="text-input"
                type="text"
                value={form.relatedSchool}
                onChange={(event) => updateForm("relatedSchool", event.target.value)}
                placeholder="例: 情報デザイン / 経営情報"
              />
            </label>

            <ScoreSelector
              label="参考度"
              value={form.helpful}
              onChange={(value) => updateForm("helpful", value)}
            />

            <label className="field-block">
              <span className="field-label">自由メモ</span>
              <textarea
                className="text-area"
                rows={4}
                value={form.freeNote}
                onChange={(event) => updateForm("freeNote", event.target.value)}
                placeholder="家族と話したこと、次に確認したいことなど"
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
        </section>
      )}

      <section className="panel">
        <SectionHeader title="相談一覧" description="タイトル、相談先、日付、要約だけを見やすく表示" />
        <div className="sort-bar">
          <label className="sort-control">
            <span className="field-label">並び順</span>
            <select
              className="text-input"
              value={sortOrder}
              onChange={(event) => handleSortChange(event.target.value as AiNotesSortOrder)}
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="helpful">参考度が高い順</option>
            </select>
          </label>
        </div>
        <div className="list-stack">
          {notes.length === 0 ? (
            <div className="empty-state">
              <p className="item-title">まだ相談メモがありません</p>
              <p className="muted-text">上の「相談を追加」から保存できます。</p>
            </div>
          ) : (
            sortedNotes.map((item) => {
              const isSelected = selectedId === item.id;

              return (
                <article key={item.id} className={`candidate-card ${isSelected ? "selected-card" : ""}`}>
                  <div className="row-between gap-sm align-start">
                    <div>
                      <p className="item-title">{item.title}</p>
                      <p className="item-subtitle">
                        {item.provider} / {item.consultedAt}
                      </p>
                    </div>
                    <span className="rating-badge">参考度 {item.helpful}</span>
                  </div>

                  <div className="note-card">
                    <p className="feedback-label">短い要約</p>
                    <p>{shorten(item.summary, 90)}</p>
                  </div>

                  <div className="action-row compact">
                    <button
                      type="button"
                      className="action-button subtle"
                      onClick={() => setSelectedId(item.id)}
                    >
                      詳細
                    </button>
                    <button type="button" className="action-button subtle" onClick={() => openEdit(item)}>
                      編集
                    </button>
                    <button type="button" className="action-button subtle danger" onClick={() => handleDelete(item)}>
                      削除
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {selectedNote && (
        <section className="panel">
          <SectionHeader title="相談詳細" description="回答全文は改行を保って読みやすく表示" />
          <div className="detail-stack">
            <div className="row-between gap-sm align-start">
              <div>
                <p className="item-title">{selectedNote.title}</p>
                <p className="item-subtitle">
                  {selectedNote.provider} / {selectedNote.consultedAt}
                </p>
              </div>
              <span className="rating-badge">参考度 {selectedNote.helpful}</span>
            </div>

            {selectedNote.relatedSchool ? (
              <div className="note-card">
                <p className="feedback-label">関連する大学・学部</p>
                <p>{selectedNote.relatedSchool}</p>
              </div>
            ) : null}

            <div className="note-card">
              <p className="feedback-label">相談した内容</p>
              <p className="preserve-lines">{selectedNote.consultationBody || "未入力"}</p>
            </div>

            <div className="note-card">
              <p className="feedback-label">AIの回答全文</p>
              <p className="preserve-lines">{selectedNote.answerBody}</p>
            </div>

            <div className="note-card">
              <p className="feedback-label">要約メモ</p>
              <p className="preserve-lines">{selectedNote.summary}</p>
            </div>

            {selectedNote.freeNote ? (
              <div className="note-card">
                <p className="feedback-label">自由メモ</p>
                <p className="preserve-lines">{selectedNote.freeNote}</p>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
