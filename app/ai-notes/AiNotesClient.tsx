"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CardActionBar } from "@/components/CardActionBar";
import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
import { UiIcon } from "@/components/UiIcon";
import { aiNotes as initialAiNotes } from "@/data/mockData";
import type { AiNote, AiProvider } from "@/data/mockData";
import { createShinromiiId } from "@/lib/shinromii-id";
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
  return createShinromiiId("ai-note");
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

function handleCardKeyActivate(event: KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function shorten(text: string, length: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > length ? `${normalized.slice(0, length)}...` : normalized;
}

function formatNoteDate(date: string) {
  return date.replaceAll("-", ".");
}

export function AiNotesClient() {
  const [notes, setNotes] = useState<AiNote[]>(initialAiNotes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<FormState>(createEmptyForm());
  const [sortOrder, setSortOrder] = useState<AiNotesSortOrder>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [pendingEditScrollId, setPendingEditScrollId] = useState<string | null>(null);
  const detailRefs = useRef<Record<string, HTMLElement | null>>({});
  const editRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const stored = loadShinromiiStorage().aiNotes;
    setNotes(stored);
    setSelectedId(null);
    setSortOrder(loadAiNotesSortOrder());
  }, []);

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

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return sortedNotes;
    }

    return sortedNotes.filter((item) => {
      const haystack = [item.title, item.summary, item.provider, item.relatedSchool]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [searchQuery, sortedNotes]);

  const formTitle = isCreating ? "相談メモを追加" : "相談メモを編集";

  function openCreate() {
    setIsCreating(true);
    setEditingId(null);
    setSelectedId(null);
    setPendingScrollId(null);
    setPendingEditScrollId(null);
    setForm(createEmptyForm());
  }

  function openEdit(note: AiNote) {
    setIsCreating(false);
    setEditingId(note.id);
    setSelectedId(null);
    setPendingEditScrollId(note.id);
    setForm(formFromNote(note));
  }

  function closeEditor() {
    setIsCreating(false);
    setEditingId(null);
    setPendingEditScrollId(null);
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
      setSelectedId(null);
      setPendingScrollId(null);
    }

    if (editingId === note.id) {
      closeEditor();
    }
  }

  function handleSortChange(nextSortOrder: AiNotesSortOrder) {
    setSortOrder(nextSortOrder);
    saveAiNotesSortOrder(nextSortOrder);
  }

  function toggleDetail(id: string) {
    if (editingId) {
      closeEditor();
    }

    setSelectedId((current) => {
      const nextId = current === id ? null : id;

      if (nextId) {
        setPendingScrollId(nextId);
      } else {
        setPendingScrollId(null);
      }

      return nextId;
    });
  }

  function renderNoteDetail(note: AiNote) {
    return (
      <section
        ref={(node) => {
          detailRefs.current[note.id] = node;
        }}
        className="ai-detail-card inline-detail-card"
      >
        <div className="ai-detail-head">
          <div>
            <p className="ai-detail-eyebrow">相談詳細</p>
            <p className="ai-detail-title">{note.title}</p>
            <p className="ai-detail-meta">
              {note.provider} / {formatNoteDate(note.consultedAt)}
            </p>
          </div>
          <span className="ai-card-helpful">参考度 {note.helpful}</span>
        </div>

        <div className="ai-detail-sections">
          <section className="ai-detail-section">
            <p className="ai-detail-section-title">相談内容</p>
            <p className="ai-detail-prose preserve-lines">
              {note.consultationBody || "未入力"}
            </p>
          </section>

          <section className="ai-detail-section">
            <p className="ai-detail-section-title">AIの回答</p>
            <p className="ai-detail-answer preserve-lines">{note.answerBody}</p>
          </section>

          <section className="ai-detail-section">
            <p className="ai-detail-section-title">整理メモ</p>
            <div className="uni-detail-entry">
              <span className="uni-detail-entry-label">要約</span>
              <span className="uni-detail-entry-value preserve-lines">{note.summary}</span>
            </div>
            <div className="uni-detail-entry">
              <span className="uni-detail-entry-label">自由メモ</span>
              <span className="uni-detail-entry-value preserve-lines">
                {note.freeNote || "まだ入力されていません"}
              </span>
            </div>
          </section>

          <section className="ai-detail-section">
            <p className="ai-detail-section-title">関連情報</p>
            <div className="uni-detail-entry">
              <span className="uni-detail-entry-label">関連候補</span>
              <span className="uni-detail-entry-value">
                {note.relatedSchool || "未入力"}
              </span>
            </div>
            <div className="uni-detail-entry">
              <span className="uni-detail-entry-label">参考度</span>
              <span className="uni-detail-entry-value">{note.helpful}</span>
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderEditor(title: string, description: string, editorId?: string) {
    return (
      <section
        ref={(node) => {
          if (editorId) {
            editRefs.current[editorId] = node;
          }
        }}
        className="panel inline-detail-card inline-editor-card"
      >
        <SectionHeader title={title} description={description} />
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
    );
  }

  useEffect(() => {
    if (!pendingScrollId || pendingScrollId !== selectedId) {
      return;
    }

    const element = detailRefs.current[pendingScrollId];

    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingScrollId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pendingScrollId, selectedId]);

  useEffect(() => {
    if (!pendingEditScrollId || pendingEditScrollId !== editingId) {
      return;
    }

    const element = editRefs.current[pendingEditScrollId];

    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingEditScrollId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [editingId, pendingEditScrollId]);

  return (
    <div className="ai-page">
      <section className="list-section">
        <div className="list-section-head">
          <div className="list-section-copy">
            <h2 className="list-section-title">AI相談メモ</h2>
            <p className="list-section-note">
              {notes.length > 0 ? `${notes.length}件を保存中` : "相談結果をあとから見返す"}
            </p>
          </div>
          <button type="button" className="list-add-button" onClick={openCreate} aria-label="相談を追加">
            <UiIcon name="plus" className="list-add-icon" />
          </button>
        </div>

        <label className="ai-search">
          <span className="uni-sort-label">検索</span>
          <input
            className="ai-search-input"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="タイトル・要約・相談先・関連大学"
          />
        </label>

        <label className="uni-sort">
          <span className="uni-sort-label">並び順</span>
          <select
            className="uni-sort-select"
            value={sortOrder}
            onChange={(event) => handleSortChange(event.target.value as AiNotesSortOrder)}
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="helpful">参考度が高い順</option>
          </select>
        </label>

        {isCreating ? renderEditor(formTitle, "長文回答もそのまま貼り付けて保存できます") : null}

        <div className="ai-list">
          {notes.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">まだ相談メモがありません</p>
              <p className="muted-text">右上の＋から保存できます。</p>
            </div>
          ) : visibleNotes.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">該当する相談メモがありません</p>
              <p className="muted-text">検索条件を変えてみてください。</p>
            </div>
          ) : (
            visibleNotes.map((item) => (
              <div key={item.id} className="detail-stack ai-stack">
                <article className={`ai-card ${selectedId === item.id || editingId === item.id ? "is-open" : ""}`}>
                  <div
                    className="card-tap-area"
                    role="button"
                    tabIndex={0}
                    aria-expanded={selectedId === item.id}
                    aria-label={`${item.title}の詳細`}
                    onClick={() => toggleDetail(item.id)}
                    onKeyDown={(event) => handleCardKeyActivate(event, () => toggleDetail(item.id))}
                  >
                    <div className="ai-card-head">
                      <span className="ai-card-icon">
                        <UiIcon name="ai" className="ai-card-icon-svg" />
                      </span>
                      <div className="ai-card-copy">
                        <p className="ai-card-title">{item.title}</p>
                        <p className="ai-card-meta">
                          {item.provider} / {formatNoteDate(item.consultedAt)}
                        </p>
                      </div>
                      <span className="ai-card-helpful">参考度 {item.helpful}</span>
                    </div>
                    <p className="ai-card-summary">{shorten(item.summary, 72)}</p>
                  </div>
                  <CardActionBar
                    actions={[
                      {
                        icon: "detail",
                        label: selectedId === item.id ? "閉じる" : "詳細",
                        onClick: () => toggleDetail(item.id),
                      },
                      {
                        icon: "edit",
                        label: editingId === item.id ? "閉じる" : "編集",
                        onClick: () => (editingId === item.id ? closeEditor() : openEdit(item)),
                      },
                      {
                        icon: "delete",
                        label: "削除",
                        onClick: () => handleDelete(item),
                        variant: "danger",
                      },
                    ]}
                  />
                </article>

                {selectedId === item.id ? renderNoteDetail(item) : null}
                {editingId === item.id
                  ? renderEditor(`${item.title}を編集`, "長文回答もそのまま貼り付けて保存できます", item.id)
                  : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
