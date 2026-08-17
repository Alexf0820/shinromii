"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CardActionBar } from "@/components/CardActionBar";
import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
import { UiIcon } from "@/components/UiIcon";
import { openCampusEvents as initialOpenCampusEvents } from "@/data/mockData";
import type {
  CampusEvaluation,
  CampusEvaluationCategory,
  OpenCampusAttachmentMeta,
  OpenCampusEvent,
  OpenCampusLink,
  OpenCampusStatus,
} from "@/data/mockData";
import {
  deleteAttachmentBlob,
  deleteAttachmentBlobsByOcId,
  getAttachmentBlob,
  isAttachmentStorageAvailable,
  saveAttachmentBlob,
} from "@/lib/shinromii-attachments";
import {
  loadShinromiiStorage,
  saveCampusEvaluations,
  saveOpenCampusEvents,
} from "@/lib/shinromii-storage";

const categoryLabels: Record<CampusEvaluationCategory, string> = {
  atmosphere: "校舎・雰囲気",
  curriculum: "学びたい内容",
  students: "学生の印象",
  access: "通いやすさ",
  career: "就職・将来性",
};

const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const maxAttachmentSizeBytes = 20 * 1024 * 1024;

type AttachmentKind = "image" | "pdf" | "other";

type PendingAttachment = {
  id: string;
  file: File;
};

type AttachmentPreview = {
  available: boolean;
  kind: AttachmentKind;
  objectUrl: string | null;
};

type EventFormState = {
  id: string;
  university: string;
  facultyDepartment: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: OpenCampusStatus;
  companionMemo: string;
  meetingPlace: string;
  accessMemo: string;
  dayMemo: string;
  links: OpenCampusLink[];
  attachments: OpenCampusAttachmentMeta[];
};

function handleCardKeyActivate(event: KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

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

function createEmptyLink(): OpenCampusLink {
  const now = todayString();

  return {
    id: createId("oc-link"),
    label: "",
    url: "",
    createdAt: now,
    updatedAt: now,
  };
}

function createEmptyEventForm(): EventFormState {
  return {
    id: createId("oc"),
    university: "",
    facultyDepartment: "",
    eventName: "オープンキャンパス",
    eventType: "オープンキャンパス",
    eventDate: todayString(),
    startTime: "",
    endTime: "",
    status: "検討中",
    companionMemo: "",
    meetingPlace: "",
    accessMemo: "",
    dayMemo: "",
    links: [],
    attachments: [],
  };
}

function formFromEvent(event: OpenCampusEvent): EventFormState {
  return {
    id: event.id,
    university: event.university,
    facultyDepartment: event.facultyDepartment,
    eventName: event.eventName,
    eventType: event.eventType,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    status: event.status,
    companionMemo: event.companionMemo,
    meetingPlace: event.meetingPlace,
    accessMemo: event.accessMemo,
    dayMemo: event.dayMemo,
    links: event.links,
    attachments: event.attachments,
  };
}

function formFromEvaluation(evaluation: CampusEvaluation): CampusEvaluation {
  return {
    overall: evaluation.overall,
    goodPoint: evaluation.goodPoint,
    badPoint: evaluation.badPoint,
    studentComment: evaluation.studentComment,
    familyComment: evaluation.familyComment,
    freeNote: evaluation.freeNote,
    categoryScores: {
      ...evaluation.categoryScores,
    },
  };
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

function formatEventDate(date: string) {
  if (!date) {
    return "日付未設定";
  }

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${year}年${Number(month)}月${Number(day)}日`;
}

function formatEventDateTime(event: OpenCampusEvent) {
  const date = formatEventDate(event.eventDate);
  const hasStart = Boolean(event.startTime);
  const hasEnd = Boolean(event.endTime);

  if (hasStart && hasEnd) {
    return `${date} ${event.startTime}-${event.endTime}`;
  }

  if (hasStart) {
    return `${date} ${event.startTime}`;
  }

  return date;
}

function matchesAllowedFileType(file: File) {
  if (allowedMimeTypes.has(file.type)) {
    return true;
  }

  const lower = file.name.toLowerCase();
  return allowedExtensions.some((extension) => lower.endsWith(extension));
}

function getAttachmentKind(meta: OpenCampusAttachmentMeta): AttachmentKind {
  const lowerName = meta.name.toLowerCase();

  if (meta.mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp"].some((extension) => lowerName.endsWith(extension))) {
    return "image";
  }

  if (meta.mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }

  return "other";
}

function normalizeAttachmentBlob(blob: Blob, meta: OpenCampusAttachmentMeta) {
  if (!meta.mimeType || blob.type === meta.mimeType) {
    return blob;
  }

  return new Blob([blob], { type: meta.mimeType });
}

function revokeObjectUrls(urls: string[]) {
  urls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
}

export function OpenCampusClient() {
  const [events, setEvents] = useState<OpenCampusEvent[]>(initialOpenCampusEvents);
  const [evaluations, setEvaluations] = useState<Record<string, CampusEvaluation>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(createEmptyEventForm());
  const [evaluationForm, setEvaluationForm] = useState<CampusEvaluation>(createEmptyEvaluation());
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, AttachmentPreview>>({});
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [pendingEditScrollId, setPendingEditScrollId] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const detailRefs = useRef<Record<string, HTMLElement | null>>({});
  const editRefs = useRef<Record<string, HTMLElement | null>>({});
  const attachmentsAvailable = isAttachmentStorageAvailable();

  useEffect(() => {
    const stored = loadShinromiiStorage();
    setEvents(stored.openCampusEvents);
    setEvaluations(stored.campusEvaluations);
    setSelectedId(null);
  }, []);

  useEffect(() => {
    return () => {
      revokeObjectUrls(objectUrlsRef.current);
      objectUrlsRef.current = [];
    };
  }, []);

  const plannedEvents = useMemo(
    () => events.filter((event) => event.status === "検討中" || event.status === "予約済み"),
    [events],
  );

  const completedEvents = useMemo(
    () => events.filter((event) => event.status === "参加済み"),
    [events],
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId],
  );

  const selectedEvaluation = useMemo(() => {
    if (!selectedEvent) {
      return createEmptyEvaluation();
    }

    return evaluations[selectedEvent.id] ?? createEmptyEvaluation();
  }, [evaluations, selectedEvent]);

  const expandedImageAttachment = useMemo(() => {
    if (!selectedEvent || !expandedImageId) {
      return null;
    }

    return selectedEvent.attachments.find((attachment) => attachment.id === expandedImageId) ?? null;
  }, [expandedImageId, selectedEvent]);

  useEffect(() => {
    revokeObjectUrls(objectUrlsRef.current);
    objectUrlsRef.current = [];

    if (!attachmentsAvailable || !selectedEvent || selectedEvent.attachments.length === 0) {
      setAttachmentPreviews({});
      return;
    }

    let active = true;

    void Promise.all(
      selectedEvent.attachments.map(async (attachment) => {
        const kind = getAttachmentKind(attachment);

        try {
          const blob = await getAttachmentBlob(attachment.id);

          if (!blob) {
            return [
              attachment.id,
              {
                available: false,
                kind,
                objectUrl: null,
              },
            ] as const;
          }

          const objectUrl = URL.createObjectURL(normalizeAttachmentBlob(blob, attachment));

          return [
            attachment.id,
            {
              available: true,
              kind,
              objectUrl,
            },
          ] as const;
        } catch {
          return [
            attachment.id,
            {
              available: false,
              kind,
              objectUrl: null,
            },
          ] as const;
        }
      }),
    ).then((entries) => {
      if (!active) {
        revokeObjectUrls(
          entries
            .map(([, preview]) => preview.objectUrl)
            .filter((url): url is string => Boolean(url)),
        );
        return;
      }

      objectUrlsRef.current = entries
        .map(([, preview]) => preview.objectUrl)
        .filter((url): url is string => Boolean(url));
      setAttachmentPreviews(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [attachmentsAvailable, selectedEvent]);

  useEffect(() => {
    if (!expandedImageId) {
      return;
    }

    if (!selectedEvent || !selectedEvent.attachments.some((attachment) => attachment.id === expandedImageId)) {
      setExpandedImageId(null);
    }
  }, [expandedImageId, selectedEvent]);

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
    if (!pendingEditScrollId || pendingEditScrollId !== editingEventId) {
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
  }, [editingEventId, pendingEditScrollId]);

  function openCreateEvent() {
    setIsCreatingEvent(true);
    setEditingEventId(null);
    setEditingEvaluationId(null);
    setSelectedId(null);
    setPendingScrollId(null);
    setPendingEditScrollId(null);
    setEventForm(createEmptyEventForm());
    setEvaluationForm(createEmptyEvaluation());
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachmentWarning(null);
  }

  function openEditEvent(event: OpenCampusEvent) {
    setIsCreatingEvent(false);
    setEditingEventId(event.id);
    setEditingEvaluationId(null);
    setSelectedId(null);
    setPendingScrollId(null);
    setPendingEditScrollId(event.id);
    setEventForm(formFromEvent(event));
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachmentWarning(null);
  }

  function closeEventEditor() {
    setIsCreatingEvent(false);
    setEditingEventId(null);
    setPendingEditScrollId(null);
    setEventForm(createEmptyEventForm());
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachmentWarning(null);
  }

  function openEvaluationEditor(event: OpenCampusEvent) {
    setIsCreatingEvent(false);
    setEditingEventId(null);
    setPendingEditScrollId(null);
    setEditingEvaluationId(event.id);
    setSelectedId(event.id);
    setEvaluationForm(formFromEvaluation(evaluations[event.id] ?? createEmptyEvaluation()));
  }

  function closeEvaluationEditor() {
    setEditingEvaluationId(null);
    setEvaluationForm(createEmptyEvaluation());
  }

  function updateEventForm<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setEventForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateLink(id: string, key: "label" | "url", value: string) {
    setEventForm((current) => ({
      ...current,
      links: current.links.map((link) =>
        link.id === id
          ? {
              ...link,
              [key]: value,
              updatedAt: todayString(),
            }
          : link,
      ),
    }));
  }

  function addLink() {
    setEventForm((current) => ({
      ...current,
      links: [...current.links, createEmptyLink()],
    }));
  }

  function removeLink(id: string) {
    setEventForm((current) => ({
      ...current,
      links: current.links.filter((link) => link.id !== id),
    }));
  }

  function removeExistingAttachment(id: string) {
    setEventForm((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id),
    }));
    setRemovedAttachmentIds((current) => [...current, id]);
  }

  function removePendingAttachment(id: string) {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  function updateEvaluationField<K extends keyof CampusEvaluation>(
    key: K,
    value: CampusEvaluation[K],
  ) {
    setEvaluationForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateEvaluationCategory(category: CampusEvaluationCategory, value: number | null) {
    setEvaluationForm((current) => ({
      ...current,
      categoryScores: {
        ...current.categoryScores,
        [category]: value,
      },
    }));
  }

  function toggleDetail(id: string) {
    if (editingEventId) {
      closeEventEditor();
    }

    if (editingEvaluationId) {
      closeEvaluationEditor();
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

  function renderEventCard(event: OpenCampusEvent) {
    const evaluation = evaluations[event.id] ?? createEmptyEvaluation();
    const isOpen = selectedId === event.id || editingEventId === event.id || editingEvaluationId === event.id;
    const timeLabel =
      event.startTime && event.endTime
        ? `${event.startTime}-${event.endTime}`
        : event.startTime || "";

    return (
      <article className={`oc-card ${isOpen ? "is-open" : ""}`}>
        <div
          className="card-tap-area"
          role="button"
          tabIndex={0}
          aria-expanded={selectedId === event.id}
          aria-label={`${event.university}の詳細`}
          onClick={() => toggleDetail(event.id)}
          onKeyDown={(eventDom) => handleCardKeyActivate(eventDom, () => toggleDetail(event.id))}
        >
          <div className="oc-card-head">
            <span className="oc-card-icon">
              <UiIcon name="campus" className="oc-card-icon-svg" />
            </span>
            <div className="oc-card-copy">
              <p className="oc-card-name">{event.university}</p>
              <p className="oc-card-faculty">
                {event.facultyDepartment ? `${event.facultyDepartment} / ` : ""}
                {event.eventName}
              </p>
            </div>
            <span
              className={`status-pill oc-status ${
                event.status === "参加済み"
                  ? "done"
                  : event.status === "予約済み"
                    ? "reserved"
                    : "considering"
              }`}
            >
              {event.status}
            </span>
          </div>

          <p className="oc-card-meta">
            {formatEventDate(event.eventDate)}
            {timeLabel ? `  ${timeLabel}` : ""}
          </p>

          {event.status === "参加済み" ? (
            <div className="oc-card-score">
              {renderStars(evaluation.overall)}
              <span className="oc-card-score-value">
                {evaluation.overall ? `総合 ${evaluation.overall}` : "未評価"}
              </span>
            </div>
          ) : null}
        </div>

        <CardActionBar
          actions={[
            {
              icon: "detail",
              label: selectedId === event.id ? "閉じる" : "詳細",
              onClick: () => toggleDetail(event.id),
            },
            {
              icon: "edit",
              label: editingEventId === event.id ? "閉じる" : "編集",
              onClick: () => (editingEventId === event.id ? closeEventEditor() : openEditEvent(event)),
            },
            ...(event.status === "参加済み"
              ? [
                  {
                    icon: "star" as const,
                    label: editingEvaluationId === event.id ? "閉じる" : "評価する",
                    onClick: () =>
                      editingEvaluationId === event.id
                        ? closeEvaluationEditor()
                        : openEvaluationEditor(event),
                  },
                ]
              : []),
            {
              icon: "delete",
              label: "削除",
              onClick: () => void handleDeleteEvent(event),
              variant: "danger" as const,
            },
          ]}
        />
      </article>
    );
  }

  function renderEventEditor(title: string, description: string, editorId?: string) {
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
              <span className="field-label">イベント種別</span>
              <input
                className="text-input"
                type="text"
                value={eventForm.eventType}
                onChange={(event) => updateEventForm("eventType", event.target.value)}
                placeholder="例: 体験授業"
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field-block">
              <span className="field-label">開催日</span>
              <input
                className="text-input"
                type="date"
                value={eventForm.eventDate}
                onChange={(event) => updateEventForm("eventDate", event.target.value)}
              />
            </label>

            <label className="field-block">
              <span className="field-label">状態</span>
              <select
                className="text-input"
                value={eventForm.status}
                onChange={(event) =>
                  updateEventForm("status", event.target.value as OpenCampusStatus)
                }
              >
                <option value="検討中">検討中</option>
                <option value="予約済み">予約済み</option>
                <option value="参加済み">参加済み</option>
              </select>
            </label>
          </div>

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

          <label className="field-block">
            <span className="field-label">同伴者メモ（任意）</span>
            <input
              className="text-input"
              type="text"
              value={eventForm.companionMemo}
              onChange={(event) => updateEventForm("companionMemo", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">集合場所（任意）</span>
            <input
              className="text-input"
              type="text"
              value={eventForm.meetingPlace}
              onChange={(event) => updateEventForm("meetingPlace", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">アクセス・行き方メモ（任意）</span>
            <textarea
              className="text-area"
              rows={3}
              value={eventForm.accessMemo}
              onChange={(event) => updateEventForm("accessMemo", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">当日のメモ（任意）</span>
            <textarea
              className="text-area"
              rows={3}
              value={eventForm.dayMemo}
              onChange={(event) => updateEventForm("dayMemo", event.target.value)}
            />
          </label>

          <div className="editor-card">
            <div className="row-between gap-sm align-start">
              <div>
                <p className="item-title small">当日リンク</p>
                <p className="muted-text">表示名 + URL を複数登録できます。</p>
              </div>
              <button type="button" className="card-action subtle" onClick={addLink}>
                <UiIcon name="plus" className="action-icon" />
                リンク追加
              </button>
            </div>

            <div className="list-stack top-gap">
              {eventForm.links.length === 0 ? (
                <div className="empty-state">
                  <p className="item-title small">まだリンクはありません</p>
                  <p className="muted-text">参加証や予約ページを追加できます。</p>
                </div>
              ) : (
                eventForm.links.map((link) => (
                  <article key={link.id} className="note-card">
                    <div className="field-grid">
                      <label className="field-block">
                        <span className="field-label">表示名</span>
                        <input
                          className="text-input"
                          type="text"
                          value={link.label}
                          onChange={(event) => updateLink(link.id, "label", event.target.value)}
                          placeholder="例: 参加証"
                        />
                      </label>

                      <label className="field-block">
                        <span className="field-label">URL</span>
                        <input
                          className="text-input"
                          type="url"
                          value={link.url}
                          onChange={(event) => updateLink(link.id, "url", event.target.value)}
                          placeholder="https://..."
                        />
                      </label>
                    </div>
                    <div className="list-actions top-gap">
                      <button type="button" className="card-action danger" onClick={() => removeLink(link.id)}>
                        <UiIcon name="delete" className="action-icon" />
                        削除
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="editor-card">
            <div className="row-between gap-sm align-start">
              <div>
                <p className="item-title small">資料・添付ファイル</p>
                <p className="muted-text">PDF / JPG / PNG / WebP、1ファイル20MBまで。</p>
              </div>
              <button
                type="button"
                className="card-action subtle"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={!attachmentsAvailable}
              >
                <UiIcon name="plus" className="action-icon" />
                ファイル追加
              </button>
            </div>

            <input
              ref={attachmentInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(event) => {
                void handleAttachmentFiles(event.target.files);
                event.target.value = "";
              }}
            />

            {!attachmentsAvailable ? (
              <div className="empty-state top-gap">
                <p className="item-title small">添付ファイル機能は利用できません</p>
                <p className="muted-text">この端末では、添付ファイルを保存できません。</p>
              </div>
            ) : null}

            {attachmentWarning ? (
              <div className="empty-state top-gap">
                <p className="item-title small">追加できなかったファイルがあります</p>
                <p className="muted-text preserve-lines">{attachmentWarning}</p>
              </div>
            ) : null}

            <div className="list-stack top-gap">
              {eventForm.attachments.map((attachment) => (
                <article key={attachment.id} className="list-card compact-card">
                  <div className="row-between gap-sm align-start">
                    <div>
                      <p className="item-title small">{attachment.name}</p>
                      <p className="item-subtitle">
                        {attachment.mimeType} / {(attachment.size / (1024 * 1024)).toFixed(1)}MB
                      </p>
                    </div>
                    <div className="list-actions">
                      <button
                        type="button"
                        className="card-action subtle"
                        onClick={() => void openAttachment(attachment)}
                      >
                        {getAttachmentKind(attachment) === "image" ? "画像を確認" : "開く"}
                      </button>
                      <button
                        type="button"
                        className="card-action danger"
                        onClick={() => removeExistingAttachment(attachment.id)}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {pendingAttachments.map((attachment) => (
                <article key={attachment.id} className="list-card compact-card">
                  <div className="row-between gap-sm align-start">
                    <div>
                      <p className="item-title small">{attachment.file.name}</p>
                      <p className="item-subtitle">
                        保存待ち / {(attachment.file.size / (1024 * 1024)).toFixed(1)}MB
                      </p>
                    </div>
                    <button
                      type="button"
                      className="card-action danger"
                      onClick={() => removePendingAttachment(attachment.id)}
                    >
                      削除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="action-row">
            <button type="button" className="action-button primary" onClick={() => void handleSaveEvent()}>
              保存する
            </button>
            <button type="button" className="action-button" onClick={closeEventEditor}>
              キャンセル
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderDetailBlock(event: OpenCampusEvent) {
    const detailEvaluation = evaluations[event.id] ?? createEmptyEvaluation();
    const imageAttachments = event.attachments.filter((attachment) => getAttachmentKind(attachment) === "image");
    const documentAttachments = event.attachments.filter((attachment) => getAttachmentKind(attachment) !== "image");

    return (
      <section
        ref={(node) => {
          detailRefs.current[event.id] = node;
        }}
        className="detail-card inline-detail-card inline-oc-detail-card oc-detail-card"
      >
        <div className="detail-section-header">
          <div>
            <p className="eyebrow">OC詳細</p>
            <p className="item-title">{event.university}</p>
            <p className="item-subtitle">
              {event.facultyDepartment ? `${event.facultyDepartment} / ` : ""}
              {event.eventName}
            </p>
          </div>
          <span
            className={`status-pill ${
              event.status === "参加済み"
                ? "done"
                : event.status === "予約済み"
                  ? "reserved"
                  : "considering"
            }`}
          >
            {event.status}
          </span>
        </div>

        <div className="list-actions top-gap">
          <button
            type="button"
            className="card-action subtle"
            onClick={() => (editingEventId === event.id ? closeEventEditor() : openEditEvent(event))}
          >
            <UiIcon name="edit" className="action-icon" />
            {editingEventId === event.id ? "編集を閉じる" : "編集"}
          </button>
          <button
            type="button"
            className="card-action danger"
            onClick={() => void handleDeleteEvent(event)}
          >
            <UiIcon name="delete" className="action-icon" />
            削除
          </button>
          {event.status === "参加済み" ? (
            <button
              type="button"
              className="card-action subtle"
              onClick={() => openEvaluationEditor(event)}
            >
              評価を編集
            </button>
          ) : null}
        </div>

        <div className="detail-section-list top-gap">
          <section className="detail-section">
            <p className="feedback-label">基本情報</p>
            <div className="detail-entry top-gap">
              <span className="detail-entry-label">大学</span>
              <span className="detail-entry-value">{event.university}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">学部・学科</span>
              <span className="detail-entry-value">
                {event.facultyDepartment || "未入力"}
              </span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">イベント名</span>
              <span className="detail-entry-value">{event.eventName}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">日時</span>
              <span className="detail-entry-value">{formatEventDateTime(event)}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">状態</span>
              <span className="detail-entry-value">{event.status}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">集合場所</span>
              <span className="detail-entry-value">{event.meetingPlace || "未入力"}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">同伴者</span>
              <span className="detail-entry-value">{event.companionMemo || "未入力"}</span>
            </div>
            <div className="detail-entry">
              <span className="detail-entry-label">アクセス</span>
              <span className="detail-entry-value preserve-lines">
                {event.accessMemo || "未入力"}
              </span>
            </div>
          </section>

          <section className="detail-section">
            <p className="feedback-label">当日リンク</p>
            <div className="oc-day-links">
              {event.links.length === 0 ? (
                <p className="muted-text">まだリンクはありません。</p>
              ) : (
                event.links.map((link) => (
                  <a key={link.id} className="oc-day-link" href={link.url}>
                    <span>{link.label || "リンクを開く"}</span>
                    <span className="oc-day-link-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                ))
              )}
            </div>
          </section>

          <section className="detail-section">
            <p className="feedback-label">資料・添付ファイル</p>
            {!attachmentsAvailable ? (
              <p className="muted-text top-gap">
                このブラウザでは添付ファイル保存に対応していません。
              </p>
            ) : null}
            <div className="list-stack top-gap">
              {event.attachments.length === 0 ? (
                <p className="muted-text">まだ添付ファイルはありません。</p>
              ) : (
                <>
                  {imageAttachments.length > 0 ? (
                    <div className="attachment-image-grid">
                      {imageAttachments.map((attachment) => {
                        const preview = attachmentPreviews[attachment.id];

                        return (
                          <article key={attachment.id} className="attachment-image-card">
                            {preview?.available && preview.objectUrl ? (
                              <button
                                type="button"
                                className="attachment-image-button"
                                onClick={() => setExpandedImageId(attachment.id)}
                              >
                                <img
                                  src={preview.objectUrl}
                                  alt={attachment.name}
                                  className="attachment-image-thumb"
                                />
                              </button>
                            ) : (
                              <div className="attachment-missing-card">
                                <p className="item-title small">{attachment.name}</p>
                                <p className="muted-text">
                                  この端末にはファイルがありません。添付ファイル本体はバックアップ対象外です。
                                </p>
                              </div>
                            )}

                            <div className="attachment-caption">
                              <p className="item-title small">{attachment.name}</p>
                              <p className="item-subtitle">
                                {(attachment.size / (1024 * 1024)).toFixed(1)}MB
                              </p>
                            </div>

                            <div className="list-actions">
                              <button
                                type="button"
                                className="card-action subtle"
                                onClick={() => setExpandedImageId(attachment.id)}
                                disabled={!preview?.available || !preview.objectUrl}
                              >
                                大きく表示
                              </button>
                              <button
                                type="button"
                                className="card-action danger"
                                onClick={() => void handleDeleteAttachment(attachment)}
                              >
                                削除
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}

                  {documentAttachments.map((attachment) => {
                    const preview = attachmentPreviews[attachment.id];
                    const isPdf = getAttachmentKind(attachment) === "pdf";

                    return (
                      <article key={attachment.id} className="list-card compact-card">
                        <div className="row-between gap-sm align-start">
                          <div>
                            <p className="item-title small">
                              {isPdf ? "PDF" : "資料"} / {attachment.name}
                            </p>
                            <p className="item-subtitle">
                              {(attachment.size / (1024 * 1024)).toFixed(1)}MB
                            </p>
                          </div>
                          <div className="list-actions">
                            {preview?.available && preview.objectUrl ? (
                              <a
                                className="card-action subtle"
                                href={preview.objectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {isPdf ? "PDFを開く" : "開く"}
                              </a>
                            ) : (
                              <button type="button" className="card-action subtle" disabled>
                                開けません
                              </button>
                            )}
                            <button
                              type="button"
                              className="card-action danger"
                              onClick={() => void handleDeleteAttachment(attachment)}
                            >
                              削除
                            </button>
                          </div>
                        </div>
                        {!preview?.available ? (
                          <p className="muted-text top-gap">
                            この端末にはファイルがありません。添付ファイル本体はバックアップ対象外です。
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </>
              )}
            </div>
          </section>

          <section className="detail-section">
            <p className="feedback-label">メモ</p>
            <div className="detail-entry top-gap">
              <span className="detail-entry-label">当日のメモ</span>
              <span className="detail-entry-value preserve-lines">
                {event.dayMemo || "未入力"}
              </span>
            </div>
          </section>

          {event.status === "参加済み" ? (
            <section className="detail-section">
              <p className="feedback-label">評価</p>
              <div className="detail-entry top-gap">
                <span className="detail-entry-label">総合評価</span>
                <span className="detail-entry-value">
                  {detailEvaluation.overall ? `${detailEvaluation.overall} / 5` : "未評価"}
                </span>
              </div>
              {(Object.entries(categoryLabels) as [CampusEvaluationCategory, string][]).map(
                ([key, label]) => (
                  <div key={key} className="detail-entry">
                    <span className="detail-entry-label">{label}</span>
                    <span className="detail-entry-value">
                      {detailEvaluation.categoryScores[key] ?? "-"}
                    </span>
                  </div>
                ),
              )}
              <div className="detail-entry">
                <span className="detail-entry-label">良かったところ</span>
                <span className="detail-entry-value preserve-lines">
                  {detailEvaluation.goodPoint || "未入力"}
                </span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">微妙だったところ</span>
                <span className="detail-entry-value preserve-lines">
                  {detailEvaluation.badPoint || "未入力"}
                </span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">本人の感想</span>
                <span className="detail-entry-value preserve-lines">
                  {detailEvaluation.studentComment || "未入力"}
                </span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">家族の感想</span>
                <span className="detail-entry-value preserve-lines">
                  {detailEvaluation.familyComment || "未入力"}
                </span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">自由メモ</span>
                <span className="detail-entry-value preserve-lines">
                  {detailEvaluation.freeNote || "未入力"}
                </span>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    );
  }

  function renderEvaluationEditor(event: OpenCampusEvent) {
    return (
      <section className="panel inline-detail-card inline-editor-card">
        <SectionHeader title="参加後評価を編集" description="参加済みOCの評価を更新" />
        <div className="form-stack">
          <ScoreSelector
            label="総合評価"
            value={evaluationForm.overall}
            onChange={(value) => updateEvaluationField("overall", value)}
          />

          {(Object.entries(categoryLabels) as [CampusEvaluationCategory, string][]).map(
            ([key, label]) => (
              <ScoreSelector
                key={key}
                label={label}
                value={evaluationForm.categoryScores[key]}
                onChange={(value) => updateEvaluationCategory(key, value)}
              />
            ),
          )}

          <label className="field-block">
            <span className="field-label">良かったところ</span>
            <textarea
              className="text-area"
              rows={3}
              value={evaluationForm.goodPoint}
              onChange={(event) => updateEvaluationField("goodPoint", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">微妙だったところ</span>
            <textarea
              className="text-area"
              rows={3}
              value={evaluationForm.badPoint}
              onChange={(event) => updateEvaluationField("badPoint", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">本人の感想</span>
            <textarea
              className="text-area"
              rows={4}
              value={evaluationForm.studentComment}
              onChange={(event) => updateEvaluationField("studentComment", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">家族の感想</span>
            <textarea
              className="text-area"
              rows={4}
              value={evaluationForm.familyComment}
              onChange={(event) => updateEvaluationField("familyComment", event.target.value)}
            />
          </label>

          <label className="field-block">
            <span className="field-label">自由メモ</span>
            <textarea
              className="text-area"
              rows={3}
              value={evaluationForm.freeNote}
              onChange={(event) => updateEvaluationField("freeNote", event.target.value)}
            />
          </label>

          <div className="action-row">
            <button type="button" className="action-button primary" onClick={handleSaveEvaluation}>
              保存する
            </button>
            <button type="button" className="action-button" onClick={closeEvaluationEditor}>
              キャンセル
            </button>
          </div>
        </div>
      </section>
    );
  }

  async function handleAttachmentFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    if (!attachmentsAvailable) {
      window.alert("このブラウザでは添付ファイル保存に対応していません。");
      return;
    }

    const nextPending: PendingAttachment[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (!matchesAllowedFileType(file)) {
        errors.push(`${file.name}: PDF / JPG / PNG / WebP のみ追加できます。`);
        return;
      }

      if (file.size > maxAttachmentSizeBytes) {
        errors.push(`${file.name}: 1ファイル20MB以下にしてください。`);
        return;
      }

      nextPending.push({
        id: createId("oc-attachment"),
        file,
      });
    });

    if (errors.length > 0) {
      const message = errors.join("\n");
      setAttachmentWarning(message);
      window.alert(message);
    } else {
      setAttachmentWarning(null);
    }

    if (nextPending.length > 0) {
      setPendingAttachments((current) => [...current, ...nextPending]);
    }
  }

  async function persistPendingAttachments(ocId: string) {
    const savedAttachmentIds: string[] = [];

    try {
      const metas: OpenCampusAttachmentMeta[] = [];

      for (const pendingAttachment of pendingAttachments) {
        const meta: OpenCampusAttachmentMeta = {
          id: pendingAttachment.id,
          ocId,
          name: pendingAttachment.file.name,
          mimeType: pendingAttachment.file.type || "application/octet-stream",
          size: pendingAttachment.file.size,
          createdAt: todayString(),
        };

        await saveAttachmentBlob({
          id: meta.id,
          ocId,
          blob: pendingAttachment.file,
          name: meta.name,
          mimeType: meta.mimeType,
          size: meta.size,
          createdAt: meta.createdAt,
        });
        savedAttachmentIds.push(meta.id);
        metas.push(meta);
      }

      return metas;
    } catch (error) {
      await Promise.all(savedAttachmentIds.map((id) => deleteAttachmentBlob(id).catch(() => undefined)));
      throw error;
    }
  }

  async function handleSaveEvent() {
    if (!eventForm.university.trim()) {
      window.alert("大学名を入力してください。");
      return;
    }

    if (!eventForm.eventName.trim()) {
      window.alert("イベント名を入力してください。");
      return;
    }

    if (!eventForm.eventDate) {
      window.alert("開催日を入力してください。");
      return;
    }

    const invalidLink = eventForm.links.find((link) => {
      const hasLabel = link.label.trim().length > 0;
      const hasUrl = link.url.trim().length > 0;
      return hasLabel !== hasUrl;
    });

    if (invalidLink) {
      window.alert("当日リンクは表示名とURLをセットで入力してください。");
      return;
    }

    const filteredLinks = eventForm.links
      .filter((link) => link.label.trim() && link.url.trim())
      .map((link) => ({
        ...link,
        label: link.label.trim(),
        url: link.url.trim(),
        updatedAt: todayString(),
      }));

    try {
      const newAttachmentMetas = pendingAttachments.length > 0
        ? await persistPendingAttachments(eventForm.id)
        : [];

      const nextEvent: OpenCampusEvent = {
        id: eventForm.id,
        university: eventForm.university.trim(),
        facultyDepartment: eventForm.facultyDepartment.trim(),
        eventName: eventForm.eventName.trim(),
        eventType: eventForm.eventType.trim() || eventForm.eventName.trim(),
        eventDate: eventForm.eventDate,
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
        status: eventForm.status,
        companionMemo: eventForm.companionMemo.trim(),
        meetingPlace: eventForm.meetingPlace.trim(),
        accessMemo: eventForm.accessMemo.trim(),
        dayMemo: eventForm.dayMemo.trim(),
        links: filteredLinks,
        attachments: [...eventForm.attachments, ...newAttachmentMetas],
        createdAt:
          events.find((event) => event.id === eventForm.id)?.createdAt ?? todayString(),
        updatedAt: todayString(),
      };

      const nextEvents = editingEventId
        ? events.map((event) => (event.id === editingEventId ? nextEvent : event))
        : [nextEvent, ...events];

      setEvents(nextEvents);
      setSelectedId(nextEvent.id);
      saveOpenCampusEvents(nextEvents);

      for (const attachmentId of removedAttachmentIds) {
        await deleteAttachmentBlob(attachmentId).catch(() => undefined);
      }

      setPendingAttachments([]);
      setRemovedAttachmentIds([]);
      closeEventEditor();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "添付ファイルの保存に失敗しました。";
      window.alert(message);
    }
  }

  function handleSaveEvaluation() {
    if (!editingEvaluationId) {
      return;
    }

    const nextEvaluation: CampusEvaluation = {
      overall: evaluationForm.overall,
      goodPoint: evaluationForm.goodPoint.trim(),
      badPoint: evaluationForm.badPoint.trim(),
      studentComment: evaluationForm.studentComment.trim(),
      familyComment: evaluationForm.familyComment.trim(),
      freeNote: evaluationForm.freeNote.trim(),
      categoryScores: evaluationForm.categoryScores,
    };

    const nextEvaluations = {
      ...evaluations,
      [editingEvaluationId]: nextEvaluation,
    };

    setEvaluations(nextEvaluations);
    saveCampusEvaluations(nextEvaluations);
    closeEvaluationEditor();
  }

  async function handleDeleteEvent(event: OpenCampusEvent) {
    const confirmed = window.confirm(`「${event.university} ${event.eventName}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    const nextEvents = events.filter((item) => item.id !== event.id);
    const nextEvaluations = { ...evaluations };
    delete nextEvaluations[event.id];

    setEvents(nextEvents);
    setEvaluations(nextEvaluations);
    saveOpenCampusEvents(nextEvents);
    saveCampusEvaluations(nextEvaluations);

    if (selectedId === event.id) {
      setSelectedId(null);
      setPendingScrollId(null);
    }

    if (editingEventId === event.id) {
      closeEventEditor();
    }

    if (editingEvaluationId === event.id) {
      closeEvaluationEditor();
    }

    if (attachmentsAvailable) {
      try {
        await deleteAttachmentBlobsByOcId(event.id);
      } catch (error) {
        window.alert("OC削除後の添付ファイル削除に失敗しました。");
      }
    }
  }

  async function handleDeleteAttachment(meta: OpenCampusAttachmentMeta) {
    if (!selectedEvent) {
      return;
    }

    const confirmed = window.confirm(`添付ファイル「${meta.name}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    const nextEvents = events.map((event) =>
      event.id === selectedEvent.id
        ? {
            ...event,
            attachments: event.attachments.filter((attachment) => attachment.id !== meta.id),
            updatedAt: todayString(),
          }
        : event,
    );
    const preview = attachmentPreviews[meta.id];

    setEvents(nextEvents);
    saveOpenCampusEvents(nextEvents);

    if (preview?.objectUrl) {
      URL.revokeObjectURL(preview.objectUrl);
      objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== preview.objectUrl);
    }

    setAttachmentPreviews((current) => {
      const next = { ...current };
      delete next[meta.id];
      return next;
    });

    if (editingEventId === selectedEvent.id) {
      setEventForm((current) => ({
        ...current,
        attachments: current.attachments.filter((attachment) => attachment.id !== meta.id),
      }));
    }

    if (expandedImageId === meta.id) {
      setExpandedImageId(null);
    }

    if (attachmentsAvailable) {
      try {
        await deleteAttachmentBlob(meta.id);
      } catch {
        window.alert("添付ファイルの削除に失敗しました。");
      }
    }
  }

  async function openAttachment(meta: OpenCampusAttachmentMeta) {
    try {
      const preview = attachmentPreviews[meta.id];

      if (preview?.kind === "image") {
        if (!preview.available || !preview.objectUrl) {
          window.alert("この端末にはファイルがありません。添付ファイル本体はバックアップ対象外です。");
          return;
        }

        setExpandedImageId(meta.id);
        return;
      }

      if (preview?.objectUrl) {
        const opened = window.open(preview.objectUrl, "_blank", "noopener,noreferrer");

        if (!opened) {
          window.alert("添付ファイルを開けませんでした。ブラウザ設定を確認してください。");
        }

        return;
      }

      const blob = await getAttachmentBlob(meta.id);

      if (!blob) {
        window.alert("この端末にはファイルがありません。添付ファイル本体はバックアップ対象外です。");
        return;
      }

      const objectUrl = URL.createObjectURL(normalizeAttachmentBlob(blob, meta));
      objectUrlsRef.current.push(objectUrl);

      const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");

      if (!opened) {
        window.alert("添付ファイルを開けませんでした。ポップアップ設定を確認してください。");
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== objectUrl);
      }, 60_000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "添付ファイルを開けませんでした。";
      window.alert(message);
    }
  }

  return (
    <div className="oc-page">
      <section className="list-section">
        <div className="list-section-head">
          <div className="list-section-copy">
            <h2 className="list-section-title">これから行く予定</h2>
            <p className="list-section-note">
              {plannedEvents.length > 0 ? `${plannedEvents.length}件` : "検討中・予約済み"}
            </p>
          </div>
          <button
            type="button"
            className="list-add-button"
            onClick={openCreateEvent}
            aria-label="オープンキャンパスを追加"
          >
            <UiIcon name="plus" className="list-add-icon" />
          </button>
        </div>

        {isCreatingEvent
          ? renderEventEditor("オープンキャンパスを追加", "日程、状態、当日リンク、資料をまとめて保存")
          : null}

        <div className="oc-list">
          {plannedEvents.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">まだ予定OCはありません</p>
              <p className="muted-text">右上の＋から追加できます。</p>
            </div>
          ) : (
            plannedEvents.map((event) => (
              <div key={event.id} className="detail-stack oc-stack">
                {renderEventCard(event)}
                {selectedId === event.id ? renderDetailBlock(event) : null}
                {editingEventId === event.id
                  ? renderEventEditor(
                      `${event.university}を編集`,
                      "日程、状態、当日リンク、資料をまとめて保存",
                      event.id,
                    )
                  : null}
                {editingEvaluationId === event.id ? renderEvaluationEditor(event) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="list-section">
        <div className="list-section-head">
          <div className="list-section-copy">
            <h2 className="list-section-title">参加済み</h2>
            <p className="list-section-note">
              {completedEvents.length > 0 ? `${completedEvents.length}件` : "評価と感想を記録"}
            </p>
          </div>
        </div>

        <div className="oc-list">
          {completedEvents.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">まだ参加済みOCはありません</p>
              <p className="muted-text">状態を「参加済み」にするとここへ移動します。</p>
            </div>
          ) : (
            completedEvents.map((event) => (
              <div key={event.id} className="detail-stack oc-stack">
                {renderEventCard(event)}
                {selectedId === event.id ? renderDetailBlock(event) : null}
                {editingEventId === event.id
                  ? renderEventEditor(
                      `${event.university}を編集`,
                      "日程、状態、当日リンク、資料をまとめて保存",
                      event.id,
                    )
                  : null}
                {editingEvaluationId === event.id ? renderEvaluationEditor(event) : null}
              </div>
            ))
          )}
        </div>
      </section>

      {expandedImageAttachment && attachmentPreviews[expandedImageAttachment.id]?.objectUrl ? (
        <div
          className="attachment-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={expandedImageAttachment.name}
          onClick={() => setExpandedImageId(null)}
        >
          <div className="attachment-lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <div className="row-between gap-sm align-start">
              <div>
                <p className="item-title small">{expandedImageAttachment.name}</p>
                <p className="item-subtitle">
                  {(expandedImageAttachment.size / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>
              <button
                type="button"
                className="card-action subtle"
                onClick={() => setExpandedImageId(null)}
              >
                閉じる
              </button>
            </div>
            <img
              src={attachmentPreviews[expandedImageAttachment.id]?.objectUrl ?? ""}
              alt={expandedImageAttachment.name}
              className="attachment-lightbox-image"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
