"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type PendingAttachment = {
  id: string;
  file: File;
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

function stopEvent(event: React.MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

export function OpenCampusClient() {
  const [events, setEvents] = useState<OpenCampusEvent[]>(initialOpenCampusEvents);
  const [evaluations, setEvaluations] = useState<Record<string, CampusEvaluation>>({});
  const [selectedId, setSelectedId] = useState<string | null>(initialOpenCampusEvents[0]?.id ?? null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(createEmptyEventForm());
  const [evaluationForm, setEvaluationForm] = useState<CampusEvaluation>(createEmptyEvaluation());
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  const [attachmentAvailability, setAttachmentAvailability] = useState<Record<string, boolean>>({});
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const attachmentsAvailable = isAttachmentStorageAvailable();

  useEffect(() => {
    const stored = loadShinromiiStorage();
    setEvents(stored.openCampusEvents);
    setEvaluations(stored.campusEvaluations);
    setSelectedId(stored.openCampusEvents[0]?.id ?? null);
  }, []);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
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

  useEffect(() => {
    if (!attachmentsAvailable || !selectedEvent || selectedEvent.attachments.length === 0) {
      setAttachmentAvailability({});
      return;
    }

    let active = true;

    void Promise.all(
      selectedEvent.attachments.map(async (attachment) => {
        try {
          const blob = await getAttachmentBlob(attachment.id);
          return [attachment.id, Boolean(blob)] as const;
        } catch {
          return [attachment.id, false] as const;
        }
      }),
    ).then((entries) => {
      if (!active) {
        return;
      }

      setAttachmentAvailability(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [attachmentsAvailable, selectedEvent]);

  function persistEvents(nextEvents: OpenCampusEvent[]) {
    setEvents(nextEvents);
    setSelectedId(nextEvents[0]?.id ?? null);
    saveOpenCampusEvents(nextEvents);
  }

  function openCreateEvent() {
    setIsCreatingEvent(true);
    setEditingEventId(null);
    setEditingEvaluationId(null);
    setEventForm(createEmptyEventForm());
    setEvaluationForm(createEmptyEvaluation());
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachmentWarning(null);
  }

  function openEditEvent(event: OpenCampusEvent) {
    setIsCreatingEvent(false);
    setEditingEventId(event.id);
    setSelectedId(event.id);
    setEventForm(formFromEvent(event));
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachmentWarning(null);
  }

  function closeEventEditor() {
    setIsCreatingEvent(false);
    setEditingEventId(null);
    setEventForm(createEmptyEventForm());
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachmentWarning(null);
  }

  function openEvaluationEditor(event: OpenCampusEvent) {
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
      setSelectedId(nextEvents[0]?.id ?? null);
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

  async function openAttachment(meta: OpenCampusAttachmentMeta) {
    try {
      const blob = await getAttachmentBlob(meta.id);

      if (!blob) {
        window.alert("この端末にはファイルがありません。添付ファイル本体はバックアップ対象外です。");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
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
    <div className="page-stack">
      <section className="page-hero tone-campus">
        <div className="page-hero-copy">
          <p className="eyebrow">オープンキャンパス</p>
          <h2 className="hero-title">予定管理から当日の資料確認、参加後の評価までまとめる。</h2>
          <p className="hero-description">
            追加、詳細、編集、削除、URL、添付、評価まで1画面の流れで扱えます。
          </p>
          <div className="hero-stats-inline">
            <span className="hero-stat-chip">
              <strong>{plannedEvents.length}件</strong>
              <span className="item-subtitle">これから行く予定</span>
            </span>
            <span className="hero-stat-chip">
              <strong>{completedEvents.length}件</strong>
              <span className="item-subtitle">参加済み</span>
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="row-between gap-sm align-start">
          <div className="compare-header no-margin">
            <span className="soft-pill">localStorage + IndexedDB</span>
            <p className="muted-text">
              OC本体は localStorage、添付本体は IndexedDB に保存します。
            </p>
          </div>
          <button type="button" className="action-button primary" onClick={openCreateEvent}>
            <UiIcon name="plus" className="action-icon" />
            オープンキャンパスを追加
          </button>
        </div>
      </section>

      {(isCreatingEvent || editingEventId) && (
        <section className="panel">
          <SectionHeader
            title={isCreatingEvent ? "オープンキャンパスを追加" : "オープンキャンパスを編集"}
            description="日程、状態、当日リンク、資料をまとめて保存"
          />

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
                  <p className="muted-text">このブラウザでは IndexedDB が使えないため、添付保存を無効化しています。</p>
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
                          開く
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
      )}

      <section className="panel">
        <SectionHeader title="これから行く予定" description="検討中と予約済みの予定をまとめて管理" />
        <div className="list-stack">
          {plannedEvents.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">まだ予定OCはありません</p>
              <p className="muted-text">上のボタンから新しく追加できます。</p>
            </div>
          ) : (
            plannedEvents.map((event) => (
              <article
                key={event.id}
                className={`candidate-card tone-campus ${selectedId === event.id ? "selected-card" : ""}`}
                onClick={() => setSelectedId(event.id)}
              >
                <div className="candidate-topline">
                  <div className="candidate-main">
                    <span className="candidate-icon-badge">
                      <UiIcon name="campus" className="list-item-icon" />
                    </span>
                    <div className="candidate-summary">
                      <p className="item-title">{event.university}</p>
                      <p className="item-subtitle">
                        {event.facultyDepartment ? `${event.facultyDepartment} / ` : ""}
                        {event.eventName}
                      </p>
                    </div>
                  </div>
                  <span className={`status-pill ${event.status === "予約済み" ? "reserved" : "considering"}`}>
                    {event.status}
                  </span>
                </div>

                <div className="qualification-meta">
                  <span className="mini-badge">{formatEventDateTime(event)}</span>
                </div>

                <p className="muted-text">{event.dayMemo || event.accessMemo || "まだメモはありません"}</p>

                <div className="list-actions">
                  <button
                    type="button"
                    className="card-action subtle"
                    onClick={(eventDom) => {
                      stopEvent(eventDom);
                      setSelectedId(event.id);
                    }}
                  >
                    <UiIcon name="detail" className="action-icon" />
                    詳細
                  </button>
                  <button
                    type="button"
                    className="card-action subtle"
                    onClick={(eventDom) => {
                      stopEvent(eventDom);
                      openEditEvent(event);
                    }}
                  >
                    <UiIcon name="edit" className="action-icon" />
                    編集
                  </button>
                  <button
                    type="button"
                    className="card-action danger"
                    onClick={(eventDom) => {
                      stopEvent(eventDom);
                      void handleDeleteEvent(event);
                    }}
                  >
                    <UiIcon name="delete" className="action-icon" />
                    削除
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <SectionHeader title="参加済み" description="評価と感想まで記録したOCを確認" />
        <div className="list-stack">
          {completedEvents.length === 0 ? (
            <div className="empty-state">
              <p className="item-title small">まだ参加済みOCはありません</p>
              <p className="muted-text">状態を「参加済み」にするとここへ移動します。</p>
            </div>
          ) : (
            completedEvents.map((event) => {
              const evaluation = evaluations[event.id] ?? createEmptyEvaluation();

              return (
                <article
                  key={event.id}
                  className={`candidate-card tone-campus ${selectedId === event.id ? "selected-card" : ""}`}
                  onClick={() => setSelectedId(event.id)}
                >
                  <div className="candidate-topline">
                    <div className="candidate-main">
                      <span className="candidate-icon-badge">
                        <UiIcon name="campus" className="list-item-icon" />
                      </span>
                      <div className="candidate-summary">
                        <p className="item-title">{event.university}</p>
                        <p className="item-subtitle">
                          {event.facultyDepartment ? `${event.facultyDepartment} / ` : ""}
                          {event.eventName}
                        </p>
                      </div>
                    </div>
                    <span className={`status-pill ${evaluation.overall ? "done" : "considering"}`}>
                      {evaluation.overall ? `総合 ${evaluation.overall}` : "未評価"}
                    </span>
                  </div>

                  <div className="summary-line">
                    {renderStars(evaluation.overall)}
                    <span className="mini-badge">{formatEventDateTime(event)}</span>
                  </div>

                  <div className="note-card">
                    <p className="feedback-label">良かったところ</p>
                    <p>{evaluation.goodPoint || "まだ入力されていません"}</p>
                  </div>

                  <div className="list-actions">
                    <button
                      type="button"
                      className="card-action subtle"
                      onClick={(eventDom) => {
                        stopEvent(eventDom);
                        setSelectedId(event.id);
                      }}
                    >
                      <UiIcon name="detail" className="action-icon" />
                      詳細
                    </button>
                    <button
                      type="button"
                      className="card-action subtle"
                      onClick={(eventDom) => {
                        stopEvent(eventDom);
                        openEditEvent(event);
                      }}
                    >
                      <UiIcon name="edit" className="action-icon" />
                      編集
                    </button>
                    <button
                      type="button"
                      className="card-action subtle"
                      onClick={(eventDom) => {
                        stopEvent(eventDom);
                        openEvaluationEditor(event);
                      }}
                    >
                      評価する
                    </button>
                    <button
                      type="button"
                      className="card-action danger"
                      onClick={(eventDom) => {
                        stopEvent(eventDom);
                        void handleDeleteEvent(event);
                      }}
                    >
                      <UiIcon name="delete" className="action-icon" />
                      削除
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {selectedEvent ? (
        <section className="detail-card">
          <div className="detail-section-header">
            <div>
              <p className="eyebrow">OC詳細</p>
              <p className="item-title">{selectedEvent.university}</p>
              <p className="item-subtitle">
                {selectedEvent.facultyDepartment ? `${selectedEvent.facultyDepartment} / ` : ""}
                {selectedEvent.eventName}
              </p>
            </div>
            <span
              className={`status-pill ${
                selectedEvent.status === "参加済み"
                  ? "done"
                  : selectedEvent.status === "予約済み"
                    ? "reserved"
                    : "considering"
              }`}
            >
              {selectedEvent.status}
            </span>
          </div>

          <div className="list-actions top-gap">
            <button type="button" className="card-action subtle" onClick={() => openEditEvent(selectedEvent)}>
              <UiIcon name="edit" className="action-icon" />
              編集
            </button>
            <button
              type="button"
              className="card-action danger"
              onClick={() => void handleDeleteEvent(selectedEvent)}
            >
              <UiIcon name="delete" className="action-icon" />
              削除
            </button>
            {selectedEvent.status === "参加済み" ? (
              <button
                type="button"
                className="card-action subtle"
                onClick={() => openEvaluationEditor(selectedEvent)}
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
                <span className="detail-entry-value">{selectedEvent.university}</span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">学部・学科</span>
                <span className="detail-entry-value">
                  {selectedEvent.facultyDepartment || "未入力"}
                </span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">イベント名</span>
                <span className="detail-entry-value">{selectedEvent.eventName}</span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">日時</span>
                <span className="detail-entry-value">{formatEventDateTime(selectedEvent)}</span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">状態</span>
                <span className="detail-entry-value">{selectedEvent.status}</span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">集合場所</span>
                <span className="detail-entry-value">{selectedEvent.meetingPlace || "未入力"}</span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">同伴者</span>
                <span className="detail-entry-value">{selectedEvent.companionMemo || "未入力"}</span>
              </div>
              <div className="detail-entry">
                <span className="detail-entry-label">アクセス</span>
                <span className="detail-entry-value preserve-lines">
                  {selectedEvent.accessMemo || "未入力"}
                </span>
              </div>
            </section>

            <section className="detail-section">
              <p className="feedback-label">当日リンク</p>
              <div className="list-stack top-gap">
                {selectedEvent.links.length === 0 ? (
                  <p className="muted-text">まだリンクはありません。</p>
                ) : (
                  selectedEvent.links.map((link) => (
                    <a key={link.id} className="card-action subtle" href={link.url}>
                      <UiIcon name="link" className="action-icon" />
                      {link.label}
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
                {selectedEvent.attachments.length === 0 ? (
                  <p className="muted-text">まだ添付ファイルはありません。</p>
                ) : (
                  selectedEvent.attachments.map((attachment) => (
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
                            disabled={attachmentAvailability[attachment.id] === false}
                          >
                            開く
                          </button>
                        </div>
                      </div>
                      {attachmentAvailability[attachment.id] === false ? (
                        <p className="muted-text top-gap">
                          この端末にはファイルがありません。添付ファイル本体はバックアップ対象外です。
                        </p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="detail-section">
              <p className="feedback-label">メモ</p>
              <div className="detail-entry top-gap">
                <span className="detail-entry-label">当日のメモ</span>
                <span className="detail-entry-value preserve-lines">
                  {selectedEvent.dayMemo || "未入力"}
                </span>
              </div>
            </section>

            {selectedEvent.status === "参加済み" ? (
              <section className="detail-section">
                <p className="feedback-label">評価</p>
                <div className="detail-entry top-gap">
                  <span className="detail-entry-label">総合評価</span>
                  <span className="detail-entry-value">
                    {selectedEvaluation.overall ? `${selectedEvaluation.overall} / 5` : "未評価"}
                  </span>
                </div>
                {(Object.entries(categoryLabels) as [CampusEvaluationCategory, string][]).map(
                  ([key, label]) => (
                    <div key={key} className="detail-entry">
                      <span className="detail-entry-label">{label}</span>
                      <span className="detail-entry-value">
                        {selectedEvaluation.categoryScores[key] ?? "-"}
                      </span>
                    </div>
                  ),
                )}
                <div className="detail-entry">
                  <span className="detail-entry-label">良かったところ</span>
                  <span className="detail-entry-value preserve-lines">
                    {selectedEvaluation.goodPoint || "未入力"}
                  </span>
                </div>
                <div className="detail-entry">
                  <span className="detail-entry-label">微妙だったところ</span>
                  <span className="detail-entry-value preserve-lines">
                    {selectedEvaluation.badPoint || "未入力"}
                  </span>
                </div>
                <div className="detail-entry">
                  <span className="detail-entry-label">本人の感想</span>
                  <span className="detail-entry-value preserve-lines">
                    {selectedEvaluation.studentComment || "未入力"}
                  </span>
                </div>
                <div className="detail-entry">
                  <span className="detail-entry-label">家族の感想</span>
                  <span className="detail-entry-value preserve-lines">
                    {selectedEvaluation.familyComment || "未入力"}
                  </span>
                </div>
                <div className="detail-entry">
                  <span className="detail-entry-label">自由メモ</span>
                  <span className="detail-entry-value preserve-lines">
                    {selectedEvaluation.freeNote || "未入力"}
                  </span>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      ) : null}

      {editingEvaluationId && selectedEvent?.id === editingEvaluationId ? (
        <section className="panel">
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
      ) : null}
    </div>
  );
}
