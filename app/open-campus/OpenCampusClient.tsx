"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CardActionBar } from "@/components/CardActionBar";
import { SectionHeader } from "@/components/SectionHeader";
import { ScoreSelector } from "@/components/ScoreSelector";
import { UiIcon } from "@/components/UiIcon";
import { openCampusEvents as initialOpenCampusEvents } from "@/data/mockData";
import type {
  CampusEvaluation,
  CampusEvaluationEntry,
  CampusEvaluationCategory,
  CampusEvaluator,
  OcLookForId,
  OcPointTagId,
  OcSimpleMark,
  OpenCampusAttachmentMeta,
  OpenCampusEvent,
  OpenCampusLink,
  OpenCampusStatus,
} from "@/data/mockData";
import { createShinromiiId } from "@/lib/shinromii-id";
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
  saveCampusEvaluationState,
  saveOpenCampusEvents,
} from "@/lib/shinromii-storage";
import {
  aspirationLabel,
  campusEvaluatorRoleLabel,
  createDefaultCampusEvaluators,
  hasCategoryScores,
  lookForLabel,
  normalizeCampusEvaluation,
  normalizeCampusEvaluationEntry,
  normalizeCampusEvaluators,
  normalizeOpenCampusEvent,
  OC_ACCESS_MARK_LABELS,
  OC_ASPIRATION_OPTIONS,
  OC_CAMPUS_MARK_LABELS,
  OC_LEARNING_MARK_LABELS,
  OC_LOOK_FOR_OPTIONS,
  OC_POINT_TAG_OPTIONS,
  OC_SIMPLE_MARKS,
  OC_STUDENT_MARK_LABELS,
  OC_TRIAL_MATCH_OPTIONS,
  pointTagLabel,
  shouldAskOpenCampusAttendance,
  toggleIdList,
} from "@/lib/oc-record";

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
  lookFor: OcLookForId[];
  lookForOther: string;
};

type EvaluationEditorTarget = {
  eventId: string;
  evaluatorId: string;
};

function statusPillTone(status: OpenCampusStatus) {
  if (status === "参加済み") {
    return "done";
  }

  if (status === "予約済み") {
    return "reserved";
  }

  if (status === "不参加") {
    return "danger";
  }

  return "considering";
}

function handleCardKeyActivate(event: KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function createId(prefix: string) {
  return createShinromiiId(prefix);
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
    simpleRatings: {},
    goodTags: [],
    concernTags: [],
    goodOther: "",
    concernOther: "",
    wantToKnow: "",
    trialLesson: {
      courseName: "",
      instructor: "",
      date: "",
      expected: "",
      match: undefined,
      noticed: "",
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
    status: "予約済み",
    companionMemo: "",
    meetingPlace: "",
    accessMemo: "",
    dayMemo: "",
    links: [],
    attachments: [],
    lookFor: [],
    lookForOther: "",
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
    lookFor: event.lookFor ?? [],
    lookForOther: event.lookForOther ?? "",
  };
}

function formFromEvaluation(evaluation: CampusEvaluation): CampusEvaluation {
  const empty = createEmptyEvaluation();

  return {
    ...empty,
    ...evaluation,
    overall: evaluation.overall,
    goodPoint: evaluation.goodPoint ?? "",
    badPoint: evaluation.badPoint ?? "",
    studentComment: evaluation.studentComment ?? "",
    familyComment: evaluation.familyComment ?? "",
    freeNote: evaluation.freeNote ?? "",
    categoryScores: {
      ...empty.categoryScores,
      ...evaluation.categoryScores,
    },
    simpleRatings: { ...evaluation.simpleRatings },
    aspiration: evaluation.aspiration,
    goodTags: evaluation.goodTags ?? [],
    goodOther: evaluation.goodOther ?? "",
    concernTags: evaluation.concernTags ?? [],
    concernOther: evaluation.concernOther ?? "",
    wantToKnow: evaluation.wantToKnow ?? "",
    trialLesson: {
      ...empty.trialLesson,
      ...evaluation.trialLesson,
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
    return "";
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

  if (date && hasStart && hasEnd) {
    return `${date} ${event.startTime}-${event.endTime}`;
  }

  if (date && hasStart) {
    return `${date} ${event.startTime}`;
  }

  if (date) {
    return date;
  }

  if (hasStart && hasEnd) {
    return `${event.startTime}-${event.endTime}`;
  }

  if (hasStart) {
    return event.startTime;
  }

  return "";
}

function renderNoteBlock(label: string, value?: string | null) {
  if (!value) {
    return null;
  }

  return (
    <div className="review-note">
      <span className="review-note-label">{label}</span>
      <p className="review-note-body preserve-lines">{value}</p>
    </div>
  );
}

function renderChipRow(values: string[]) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="review-chips">
      {values.map((value) => (
        <span key={value} className="review-chip">
          {value}
        </span>
      ))}
    </div>
  );
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
  const [campusEvaluators, setCampusEvaluators] = useState<CampusEvaluator[]>(createDefaultCampusEvaluators);
  const [evaluations, setEvaluations] = useState<Record<string, CampusEvaluationEntry[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEvaluationTarget, setEditingEvaluationTarget] = useState<EvaluationEditorTarget | null>(null);
  const [evaluationChooserEventId, setEvaluationChooserEventId] = useState<string | null>(null);
  const [newEvaluatorName, setNewEvaluatorName] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createIntent, setCreateIntent] = useState<"upcoming" | "done">("upcoming");
  const [pendingEvalInviteId, setPendingEvalInviteId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(createEmptyEventForm());
  const [evaluationForm, setEvaluationForm] = useState<CampusEvaluation>(createEmptyEvaluation());
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  const [directAttachmentMessage, setDirectAttachmentMessage] = useState<{
    eventId: string;
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, AttachmentPreview>>({});
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [pendingEditScrollId, setPendingEditScrollId] = useState<string | null>(null);
  const [pendingEvalScrollId, setPendingEvalScrollId] = useState<string | null>(null);
  const [deferredAttendanceIds, setDeferredAttendanceIds] = useState<string[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const directAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const directAttachmentEventIdRef = useRef<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const detailRefs = useRef<Record<string, HTMLElement | null>>({});
  const editRefs = useRef<Record<string, HTMLElement | null>>({});
  const evalEditorRef = useRef<HTMLElement | null>(null);
  const attachmentsAvailable = isAttachmentStorageAvailable();

  useEffect(() => {
    const stored = loadShinromiiStorage();
    setEvents(stored.openCampusEvents);
    setCampusEvaluators(stored.campusEvaluators);
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

  const skippedEvents = useMemo(
    () => events.filter((event) => event.status === "不参加"),
    [events],
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId],
  );

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

  useLayoutEffect(() => {
    if (!pendingEvalScrollId || pendingEvalScrollId !== editingEvaluationTarget?.eventId) {
      return;
    }

    const element = evalEditorRef.current;

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
    setPendingEvalScrollId(null);
  }, [editingEvaluationTarget, pendingEvalScrollId]);

  useLayoutEffect(() => {
    if (!pendingEvalInviteId) {
      return;
    }

    const element = document.querySelector(".oc-eval-invite");

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }, [pendingEvalInviteId]);

  function eventEvaluations(eventId: string) {
    return evaluations[eventId] ?? [];
  }

  function findEvaluationEntry(eventId: string, evaluatorId: string) {
    return eventEvaluations(eventId).find((entry) => entry.evaluatorId === evaluatorId) ?? null;
  }

  function findCampusEvaluator(evaluatorId: string) {
    return campusEvaluators.find((evaluator) => evaluator.id === evaluatorId) ?? null;
  }

  function representativeEvaluation(eventId: string) {
    return eventEvaluations(eventId)[0] ?? null;
  }

  function evaluationDisplayName(entry: CampusEvaluationEntry) {
    return entry.legacyLabel ?? entry.evaluatorName;
  }

  function hasSavedEvaluation(entry: CampusEvaluationEntry | CampusEvaluation) {
    return Boolean(
      entry.overall ||
        (entry.simpleRatings && Object.keys(entry.simpleRatings).length > 0) ||
        entry.aspiration ||
        (entry.goodTags && entry.goodTags.length > 0) ||
        (entry.concernTags && entry.concernTags.length > 0) ||
        entry.goodPoint ||
        entry.badPoint ||
        entry.wantToKnow ||
        entry.freeNote ||
        entry.studentComment ||
        entry.familyComment ||
        hasCategoryScores(entry) ||
        entry.trialLesson?.courseName ||
        entry.trialLesson?.instructor ||
        entry.trialLesson?.date ||
        entry.trialLesson?.expected ||
        entry.trialLesson?.match ||
        entry.trialLesson?.noticed,
    );
  }

  function openCreateEvent() {
    setIsCreatingEvent(true);
    setCreateIntent("upcoming");
    setPendingEvalInviteId(null);
    setEditingEventId(null);
    setEditingEvaluationTarget(null);
    setEvaluationChooserEventId(null);
    setNewEvaluatorName("");
    setSelectedId(null);
    setPendingScrollId(null);
    setPendingEditScrollId(null);
    setPendingEvalScrollId(null);
    setEventForm(createEmptyEventForm());
    setEvaluationForm(createEmptyEvaluation());
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachmentWarning(null);
  }

  function openEditEvent(event: OpenCampusEvent) {
    setIsCreatingEvent(false);
    setEditingEventId(event.id);
    setEditingEvaluationTarget(null);
    setEvaluationChooserEventId(null);
    setNewEvaluatorName("");
    setSelectedId(null);
    setPendingScrollId(null);
    setPendingEditScrollId(event.id);
    setPendingEvalScrollId(null);
    setEventForm(formFromEvent(event));
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachmentWarning(null);
    setDirectAttachmentMessage(null);
  }

  function closeEventEditor() {
    setIsCreatingEvent(false);
    setCreateIntent("upcoming");
    setEditingEventId(null);
    setPendingEditScrollId(null);
    setEventForm(createEmptyEventForm());
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setAttachmentWarning(null);
  }

  function openEvaluationChooser(eventId: string) {
    setIsCreatingEvent(false);
    setEditingEventId(null);
    setPendingEditScrollId(null);
    setPendingEvalInviteId(null);
    setSelectedId(eventId);
    setPendingScrollId(eventId);
    setEvaluationChooserEventId(eventId);
    setEditingEvaluationTarget(null);
    setPendingEvalScrollId(null);
    setNewEvaluatorName("");
  }

  function openEvaluationEditor(
    event: OpenCampusEvent,
    evaluatorId: string,
    providedEvaluator?: CampusEvaluator,
  ) {
    const existingEntry = findEvaluationEntry(event.id, evaluatorId);
    const evaluator =
      providedEvaluator ??
      findCampusEvaluator(evaluatorId) ??
      (existingEntry
        ? {
            id: existingEntry.evaluatorId,
            name: existingEntry.evaluatorName,
            role: existingEntry.evaluatorRole,
            createdAt: existingEntry.createdAt,
            updatedAt: existingEntry.updatedAt,
          }
        : null);

    if (!existingEntry && !evaluator) {
      window.alert("評価する人を確認できませんでした。もう一度お試しください。");
      return;
    }

    setIsCreatingEvent(false);
    setEditingEventId(null);
    setPendingEditScrollId(null);
    setPendingScrollId(null);
    setSelectedId(null);
    setPendingEvalInviteId(null);
    setEvaluationChooserEventId(null);
    setNewEvaluatorName("");
    setEditingEvaluationTarget({
      eventId: event.id,
      evaluatorId,
    });
    setPendingEvalScrollId(event.id);
    setEvaluationForm(formFromEvaluation(existingEntry ?? createEmptyEvaluation()));
  }

  function closeEvaluationEditor() {
    setEditingEvaluationTarget(null);
    setEvaluationChooserEventId(null);
    setPendingEvalScrollId(null);
    setNewEvaluatorName("");
    setEvaluationForm(createEmptyEvaluation());
  }

  function persistEventStatus(event: OpenCampusEvent, status: OpenCampusStatus) {
    const nextEvent = normalizeOpenCampusEvent({
      ...event,
      status,
      updatedAt: todayString(),
    });
    const nextEvents = events.map((item) => (item.id === event.id ? nextEvent : item));
    setEvents(nextEvents);
    saveOpenCampusEvents(nextEvents);
    return nextEvent;
  }

  function handleAttended(event: OpenCampusEvent) {
    setDirectAttachmentMessage(null);
    persistEventStatus(event, "参加済み");
    openEvaluationChooser(event.id);
  }

  function handleSkipped(event: OpenCampusEvent) {
    setDirectAttachmentMessage(null);
    persistEventStatus(event, "不参加");
    closeEvaluationEditor();
    setSelectedId(null);
  }

  function handleDeferAttendance(eventId: string) {
    setDeferredAttendanceIds((current) => (current.includes(eventId) ? current : [...current, eventId]));
  }

  function setCreateKind(intent: "upcoming" | "done") {
    setCreateIntent(intent);
    setEventForm((current) => {
      if (intent === "done") {
        return {
          ...current,
          status: "参加済み",
          eventDate: current.eventDate === todayString() ? "" : current.eventDate,
        };
      }

      return {
        ...current,
        status: "予約済み",
        eventDate: current.eventDate || todayString(),
      };
    });
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

  function updateSimpleRating(key: keyof NonNullable<CampusEvaluation["simpleRatings"]>, value: OcSimpleMark) {
    setEvaluationForm((current) => {
      const currentValue = current.simpleRatings?.[key];
      const nextRatings = { ...current.simpleRatings };

      if (currentValue === value) {
        delete nextRatings[key];
      } else {
        nextRatings[key] = value;
      }

      return {
        ...current,
        simpleRatings: nextRatings,
      };
    });
  }

  function updateTrialLesson<K extends keyof NonNullable<CampusEvaluation["trialLesson"]>>(
    key: K,
    value: NonNullable<CampusEvaluation["trialLesson"]>[K],
  ) {
    setEvaluationForm((current) => ({
      ...current,
      trialLesson: {
        ...current.trialLesson,
        [key]: value,
      },
    }));
  }

  function renderMarkButtons(
    labels: Record<OcSimpleMark, string>,
    value: OcSimpleMark | undefined,
    onSelect: (mark: OcSimpleMark) => void,
  ) {
    return (
      <div className="oc-simple-rating">
        {OC_SIMPLE_MARKS.map((mark) => (
          <button
            key={mark}
            type="button"
            className={`oc-simple-rating-btn ${value === mark ? "active" : ""}`}
            aria-pressed={value === mark}
            onClick={() => onSelect(mark)}
          >
            {labels[mark]}
          </button>
        ))}
      </div>
    );
  }

  function renderTagButtons(
    selected: OcPointTagId[],
    onToggle: (id: OcPointTagId) => void,
  ) {
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

  function toggleDetail(id: string) {
    if (editingEventId) {
      closeEventEditor();
    }

    if (editingEvaluationTarget) {
      closeEvaluationEditor();
    }

    setEvaluationChooserEventId(null);
    setNewEvaluatorName("");

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
    const evaluation = representativeEvaluation(event.id);
    const isOpen =
      selectedId === event.id || editingEventId === event.id || editingEvaluationTarget?.eventId === event.id;
    const dateLabel = formatEventDate(event.eventDate);
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
            <span className={`status-pill oc-status ${statusPillTone(event.status)}`}>
              {event.status}
            </span>
          </div>

          {dateLabel || timeLabel ? (
            <p className="oc-card-meta">
              {dateLabel}
              {timeLabel ? `${dateLabel ? "  " : ""}${timeLabel}` : ""}
            </p>
          ) : null}

          {event.status === "参加済み" && evaluation?.overall ? (
            <div className="oc-card-score">{renderStars(evaluation.overall)}</div>
          ) : null}
        </div>

        {shouldAskOpenCampusAttendance(event) && !deferredAttendanceIds.includes(event.id) ? (
          <div className="oc-attend-prompt">
            <p className="oc-attend-prompt-title">このOCには参加しましたか？</p>
            <div className="oc-attend-actions">
              <button type="button" className="card-action primary" onClick={() => handleAttended(event)}>
                参加した
              </button>
              <button type="button" className="card-action" onClick={() => handleSkipped(event)}>
                参加しなかった
              </button>
              <button
                type="button"
                className="card-action subtle oc-attend-later"
                onClick={() => handleDeferAttendance(event.id)}
              >
                あとで
              </button>
            </div>
          </div>
        ) : null}

        {pendingEvalInviteId === event.id ? (
          <div className="oc-attend-prompt oc-eval-invite">
            <p className="oc-attend-prompt-title">登録しました。続けて評価しますか？</p>
            <div className="oc-attend-actions">
              <button type="button" className="card-action primary" onClick={() => openEvaluationChooser(event.id)}>
                30秒で評価する
              </button>
              <button
                type="button"
                className="card-action subtle oc-attend-later"
                onClick={() => setPendingEvalInviteId(null)}
              >
                あとで
              </button>
            </div>
          </div>
        ) : null}

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
                    label: editingEvaluationTarget?.eventId === event.id ? "閉じる" : "評価する",
                    onClick: () =>
                      editingEvaluationTarget?.eventId === event.id
                        ? closeEvaluationEditor()
                        : openEvaluationChooser(event.id),
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
    const isCreate = !editorId;
    const isDoneCreate = isCreate && createIntent === "done";

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
          {isCreate ? (
            <div className="field-block">
              <span className="field-label">このOCは？</span>
              <div className="oc-intent-toggle">
                <button
                  type="button"
                  className={`choice-chip oc-choice-chip ${createIntent === "upcoming" ? "active" : ""}`}
                  aria-pressed={createIntent === "upcoming"}
                  onClick={() => setCreateKind("upcoming")}
                >
                  これから参加
                </button>
                <button
                  type="button"
                  className={`choice-chip oc-choice-chip ${createIntent === "done" ? "active" : ""}`}
                  aria-pressed={createIntent === "done"}
                  onClick={() => setCreateKind("done")}
                >
                  参加済み
                </button>
              </div>
            </div>
          ) : null}

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
              <span className="field-label">{isDoneCreate ? "参加日" : "開催日"}</span>
              <input
                className="text-input"
                type="date"
                value={eventForm.eventDate}
                onChange={(event) => updateEventForm("eventDate", event.target.value)}
              />
            </label>

            {isCreate ? null : (
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
                <option value="不参加">不参加</option>
              </select>
            </label>
            )}
          </div>

          {isDoneCreate ? (
            <details className="oc-detail-fold">
              <summary className="oc-detail-fold-summary">準備・当日の情報（任意）</summary>
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
                  onClick={() =>
                    updateEventForm("lookFor", toggleIdList(eventForm.lookFor, option.id))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            {eventForm.lookFor.includes("other") ? (
              <label className="field-block top-gap">
                <span className="field-label">その他</span>
                <input
                  className="text-input"
                  type="text"
                  value={eventForm.lookForOther}
                  onChange={(event) => updateEventForm("lookForOther", event.target.value)}
                />
              </label>
            ) : null}
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
              </div>
            </details>
          ) : (
            <>
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
                  onClick={() =>
                    updateEventForm("lookFor", toggleIdList(eventForm.lookFor, option.id))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            {eventForm.lookFor.includes("other") ? (
              <label className="field-block top-gap">
                <span className="field-label">その他</span>
                <input
                  className="text-input"
                  type="text"
                  value={eventForm.lookForOther}
                  onChange={(event) => updateEventForm("lookForOther", event.target.value)}
                />
              </label>
            ) : null}
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
            </>
          )}

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
    const detailEvaluations = eventEvaluations(event.id);
    const imageAttachments = event.attachments.filter((attachment) => getAttachmentKind(attachment) === "image");
    const documentAttachments = event.attachments.filter((attachment) => getAttachmentKind(attachment) !== "image");
    const dateTimeLabel = formatEventDateTime(event);
    const lookForChips = (event.lookFor ?? []).map((id) => {
      const label = lookForLabel(id);
      return id === "other" && event.lookForOther ? `${label}：${event.lookForOther}` : label;
    });
    const dayInfoItems = [
      event.meetingPlace ? { label: "集合場所", value: event.meetingPlace } : null,
      event.companionMemo ? { label: "同伴者", value: event.companionMemo } : null,
      event.accessMemo ? { label: "アクセス", value: event.accessMemo } : null,
    ].filter((item): item is { label: string; value: string } => item !== null);
    const hasDayInfo = dayInfoItems.length > 0 || lookForChips.length > 0;
    const isUpcoming = event.status === "検討中" || event.status === "予約済み";

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
          <span className={`status-pill ${statusPillTone(event.status)}`}>{event.status}</span>
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
          <button type="button" className="card-action danger" onClick={() => void handleDeleteEvent(event)}>
            <UiIcon name="delete" className="action-icon" />
            削除
          </button>
          {event.status === "参加済み" ? (
            <button type="button" className="card-action subtle" onClick={() => openEvaluationChooser(event.id)}>
              評価を追加
            </button>
          ) : null}
        </div>

        <div className="top-gap">
          {dateTimeLabel ? (
            <section className="detail-group">
              <p className="detail-group-title">基本情報</p>
              {renderNoteBlock("日時", dateTimeLabel)}
            </section>
          ) : null}

          {hasDayInfo ? (
            <section className="detail-group">
              <p className="detail-group-title">当日の情報</p>
              {dayInfoItems.map((item) => (
                <div key={item.label}>{renderNoteBlock(item.label, item.value)}</div>
              ))}
              {lookForChips.length > 0 ? (
                <div className={dayInfoItems.length > 0 ? "top-gap" : ""}>
                  <span className="review-note-label">見ておきたいこと</span>
                  <div className="top-gap">{renderChipRow(lookForChips)}</div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="detail-group">
            <p className="detail-group-title">メモ・資料</p>
            {isUpcoming || event.links.length > 0 ? (
              <div>
                <span className="review-note-label">当日リンク</span>
                {event.links.length > 0 ? (
                  <div className="oc-day-links">
                    {event.links.map((link) => (
                      <a key={link.id} className="oc-day-link" href={link.url}>
                        <span>{link.label || "当日ページを開く"}</span>
                        <span className="oc-day-link-arrow" aria-hidden="true">
                          ↗
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="muted-text top-gap">まだリンクはありません。</p>
                )}
              </div>
            ) : null}
            <div className={isUpcoming || event.links.length > 0 ? "top-gap" : ""}>
              <div className="row-between gap-sm align-start">
                <span className="review-note-label">資料・添付ファイル</span>
                <button
                  type="button"
                  className="card-action subtle"
                  onClick={() => openDirectAttachmentPicker(event.id)}
                  disabled={!attachmentsAvailable}
                >
                  <UiIcon name="plus" className="action-icon" />
                  ファイル追加
                </button>
              </div>
              {event.attachments.length > 0 ? (
                <div className="list-stack top-gap">
                  {!attachmentsAvailable ? (
                    <p className="muted-text">このブラウザでは添付ファイル保存に対応していません。</p>
                  ) : null}
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
                              <p className="item-subtitle">{(attachment.size / (1024 * 1024)).toFixed(1)}MB</p>
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
                            <p className="item-subtitle">{(attachment.size / (1024 * 1024)).toFixed(1)}MB</p>
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
                </div>
              ) : (
                <p className="muted-text top-gap">まだ添付ファイルはありません。</p>
              )}
              {directAttachmentMessage?.eventId === event.id ? (
                <p className={`muted-text top-gap${directAttachmentMessage.tone === "error" ? " danger-text" : ""}`}>
                  {directAttachmentMessage.text}
                </p>
              ) : null}
            </div>
            {event.dayMemo ? (
              <div className="top-gap">{renderNoteBlock("当日のメモ", event.dayMemo)}</div>
            ) : null}
          </section>

          {event.status === "参加済み" ? (
            <section className="detail-group">
              <div className="row-between gap-sm align-start">
                <div>
                  <p className="detail-group-title">みんなの評価</p>
                  <p className="muted-text">
                    {detailEvaluations.length > 0 ? `${detailEvaluations.length}人分の評価があります。` : "まだ評価はありません。"}
                  </p>
                </div>
                <button type="button" className="card-action subtle" onClick={() => openEvaluationChooser(event.id)}>
                  評価を追加
                </button>
              </div>

              {detailEvaluations.length > 0 ? (
                <div className="list-stack top-gap">
                  {detailEvaluations.map((entry) => {
                    const simpleMarks = [
                      entry.simpleRatings?.campus
                        ? { label: "校舎・設備", value: OC_CAMPUS_MARK_LABELS[entry.simpleRatings.campus] }
                        : null,
                      entry.simpleRatings?.students
                        ? { label: "学生の雰囲気", value: OC_STUDENT_MARK_LABELS[entry.simpleRatings.students] }
                        : null,
                      entry.simpleRatings?.learning
                        ? { label: "授業・学び", value: OC_LEARNING_MARK_LABELS[entry.simpleRatings.learning] }
                        : null,
                      entry.simpleRatings?.access
                        ? { label: "通いやすさ", value: OC_ACCESS_MARK_LABELS[entry.simpleRatings.access] }
                        : null,
                    ].filter((item): item is { label: string; value: string } => item !== null);
                    const goodTagChips = [
                      ...(entry.goodTags ?? []).map((id) => pointTagLabel(id)),
                      entry.goodTags?.includes("other") && entry.goodOther ? entry.goodOther : "",
                    ].filter(Boolean);
                    const concernTagChips = [
                      ...(entry.concernTags ?? []).map((id) => pointTagLabel(id)),
                      entry.concernTags?.includes("other") && entry.concernOther ? entry.concernOther : "",
                    ].filter(Boolean);
                    const trialMatchLabel = entry.trialLesson?.match
                      ? OC_TRIAL_MATCH_OPTIONS.find((option) => option.id === entry.trialLesson?.match)?.label
                      : "";

                    return (
                      <article key={entry.id} className="list-card compact-card">
                        <div className="row-between gap-sm align-start">
                          <div>
                            <p className="item-title small">{evaluationDisplayName(entry)}</p>
                            <p className="item-subtitle">{campusEvaluatorRoleLabel(entry.evaluatorRole)}</p>
                          </div>
                          <button
                            type="button"
                            className="card-action subtle"
                            onClick={() => openEvaluationEditor(event, entry.evaluatorId)}
                          >
                            編集
                          </button>
                        </div>
                        {entry.overall ? (
                          <div className="oc-eval-hero top-gap">
                            {renderStars(entry.overall)}
                            <span className="oc-eval-hero-value">{entry.overall} / 5</span>
                          </div>
                        ) : null}
                        {simpleMarks.length > 0 ? (
                          <div className="oc-eval-marks top-gap">
                            {simpleMarks.map((item) => (
                              <div key={item.label} className="oc-eval-mark">
                                <span className="oc-eval-mark-label">{item.label}</span>
                                <span className="oc-eval-mark-value">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {entry.aspiration ? (
                          <div className="top-gap">
                            <span className="review-note-label">今の志望度</span>
                            <div className="top-gap">{renderChipRow([aspirationLabel(entry.aspiration)])}</div>
                          </div>
                        ) : null}
                        {hasCategoryScores(entry) ? (
                          <div className="oc-eval-marks top-gap">
                            {(Object.entries(categoryLabels) as [CampusEvaluationCategory, string][]).map(
                              ([key, label]) =>
                                entry.categoryScores[key] != null ? (
                                  <div key={key} className="oc-eval-mark">
                                    <span className="oc-eval-mark-label">{label}</span>
                                    <span className="oc-eval-mark-value">{entry.categoryScores[key]}</span>
                                  </div>
                                ) : null,
                            )}
                          </div>
                        ) : null}
                        {goodTagChips.length > 0 ? (
                          <div className="top-gap">
                            <span className="review-note-label">良かったところ</span>
                            <div className="top-gap">{renderChipRow(goodTagChips)}</div>
                          </div>
                        ) : null}
                        {concernTagChips.length > 0 ? (
                          <div className="top-gap">
                            <span className="review-note-label">気になったところ</span>
                            <div className="top-gap">{renderChipRow(concernTagChips)}</div>
                          </div>
                        ) : null}
                        {!hasSavedEvaluation(entry) ? (
                          <p className="muted-text top-gap">まだ入力はありません。</p>
                        ) : null}
                        {renderNoteBlock("良かったこと", entry.goodPoint)}
                        {renderNoteBlock("気になったこと", entry.badPoint)}
                        {renderNoteBlock("もっと知りたいこと", entry.wantToKnow)}
                        {renderNoteBlock("ひとことメモ", entry.freeNote)}
                        {renderNoteBlock("感想", entry.studentComment)}
                        {renderNoteBlock("追加メモ", entry.familyComment)}
                        {entry.trialLesson?.courseName ||
                        entry.trialLesson?.instructor ||
                        entry.trialLesson?.date ||
                        entry.trialLesson?.expected ||
                        entry.trialLesson?.match ||
                        entry.trialLesson?.noticed ? (
                          <div className="top-gap">
                            <span className="review-note-label">模擬・体験授業</span>
                            {renderNoteBlock("講座名", entry.trialLesson?.courseName)}
                            {renderNoteBlock("講師名", entry.trialLesson?.instructor)}
                            {renderNoteBlock("受講日", entry.trialLesson?.date)}
                            {renderNoteBlock("受ける前に想像していたこと", entry.trialLesson?.expected)}
                            {renderNoteBlock("実際に受けてどうだったか", trialMatchLabel)}
                            {renderNoteBlock("授業を受けて気づいたこと", entry.trialLesson?.noticed)}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="muted-text top-gap">まだ評価はありません。</p>
              )}

              {evaluationChooserEventId === event.id ? (
                <div className="list-card compact-card top-gap">
                  <p className="item-title small">だれの評価？</p>
                  <div className="choice-chips oc-choice-chips top-gap">
                    {campusEvaluators.map((evaluator) => {
                      const existingEntry = findEvaluationEntry(event.id, evaluator.id);

                      return (
                        <button
                          key={evaluator.id}
                          type="button"
                          className="choice-chip oc-choice-chip"
                          onClick={() => openEvaluationEditor(event, evaluator.id)}
                        >
                          {evaluator.name}
                          {existingEntry ? "（編集）" : ""}
                        </button>
                      );
                    })}
                  </div>
                  <label className="field-block top-gap">
                    <span className="field-label">新しく評価する人の名前</span>
                    <input
                      className="text-input"
                      type="text"
                      value={newEvaluatorName}
                      onChange={(eventDom) => setNewEvaluatorName(eventDom.target.value)}
                      placeholder="例: お母さん"
                    />
                  </label>
                  <div className="action-row">
                    <button type="button" className="action-button primary" onClick={() => handleAddCampusEvaluator(event)}>
                      ＋ 評価する人を追加
                    </button>
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => {
                        setEvaluationChooserEventId(null);
                        setNewEvaluatorName("");
                      }}
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    );
  }

  function renderEvaluationEditor() {
    const editingEvaluator = editingEvaluationTarget
      ? findCampusEvaluator(editingEvaluationTarget.evaluatorId)
      : null;
    const goodTags = evaluationForm.goodTags ?? [];
    const concernTags = evaluationForm.concernTags ?? [];
    const trial = evaluationForm.trialLesson ?? {};

    return (
      <section
        ref={(node) => {
          evalEditorRef.current = node;
        }}
        className="panel inline-detail-card inline-editor-card oc-eval-editor"
      >
        <SectionHeader
          title={editingEvaluator ? `${editingEvaluator.name}の評価` : "OCどうだった？"}
          description="選ぶだけで残せます。全部空でも保存できます。"
        />
        <div className="form-stack">
          <ScoreSelector
            label="総合評価"
            value={evaluationForm.overall}
            onChange={(value) => updateEvaluationField("overall", value)}
          />

          <div className="field-block">
            <span className="field-label">校舎・設備</span>
            {renderMarkButtons(OC_CAMPUS_MARK_LABELS, evaluationForm.simpleRatings?.campus, (mark) =>
              updateSimpleRating("campus", mark),
            )}
          </div>

          <div className="field-block">
            <span className="field-label">学生の雰囲気</span>
            {renderMarkButtons(OC_STUDENT_MARK_LABELS, evaluationForm.simpleRatings?.students, (mark) =>
              updateSimpleRating("students", mark),
            )}
          </div>

          <div className="field-block">
            <span className="field-label">授業・学び</span>
            {renderMarkButtons(OC_LEARNING_MARK_LABELS, evaluationForm.simpleRatings?.learning, (mark) =>
              updateSimpleRating("learning", mark),
            )}
          </div>

          <div className="field-block">
            <span className="field-label">通いやすさ</span>
            {renderMarkButtons(OC_ACCESS_MARK_LABELS, evaluationForm.simpleRatings?.access, (mark) =>
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
                  className={`choice-chip oc-choice-chip ${evaluationForm.aspiration === option.id ? "active" : ""}`}
                  aria-pressed={evaluationForm.aspiration === option.id}
                  onClick={() =>
                    updateEvaluationField(
                      "aspiration",
                      evaluationForm.aspiration === option.id ? undefined : option.id,
                    )
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-block">
            <span className="field-label">良かったところ</span>
            {renderTagButtons(goodTags, (id) =>
              updateEvaluationField("goodTags", toggleIdList(goodTags, id)),
            )}
            {goodTags.includes("other") ? (
              <label className="field-block top-gap">
                <span className="field-label">その他</span>
                <input
                  className="text-input"
                  type="text"
                  value={evaluationForm.goodOther ?? ""}
                  onChange={(event) => updateEvaluationField("goodOther", event.target.value)}
                />
              </label>
            ) : null}
          </div>

          <div className="field-block">
            <span className="field-label">気になったところ</span>
            {renderTagButtons(concernTags, (id) =>
              updateEvaluationField("concernTags", toggleIdList(concernTags, id)),
            )}
            {concernTags.includes("other") ? (
              <label className="field-block top-gap">
                <span className="field-label">その他</span>
                <input
                  className="text-input"
                  type="text"
                  value={evaluationForm.concernOther ?? ""}
                  onChange={(event) => updateEvaluationField("concernOther", event.target.value)}
                />
              </label>
            ) : null}
          </div>

          <details className="oc-detail-fold">
            <summary className="oc-detail-fold-summary">詳しく記録する</summary>
            <div className="form-stack top-gap">
              <label className="field-block">
                <span className="field-label">良かったこと（任意）</span>
                <textarea
                  className="text-area"
                  rows={3}
                  value={evaluationForm.goodPoint}
                  onChange={(event) => updateEvaluationField("goodPoint", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">いまいちだったこと（任意）</span>
                <textarea
                  className="text-area"
                  rows={3}
                  value={evaluationForm.badPoint}
                  onChange={(event) => updateEvaluationField("badPoint", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">もっと知りたいこと / 確認できなかったこと（任意）</span>
                <textarea
                  className="text-area"
                  rows={3}
                  value={evaluationForm.wantToKnow ?? ""}
                  onChange={(event) => updateEvaluationField("wantToKnow", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">ひとことメモ（任意）</span>
                <textarea
                  className="text-area"
                  rows={3}
                  value={evaluationForm.freeNote}
                  onChange={(event) => updateEvaluationField("freeNote", event.target.value)}
                />
              </label>

              <p className="feedback-label">模擬・体験授業（任意）</p>

              <div className="field-grid">
                <label className="field-block">
                  <span className="field-label">講座名</span>
                  <input
                    className="text-input"
                    type="text"
                    value={trial.courseName ?? ""}
                    onChange={(event) => updateTrialLesson("courseName", event.target.value)}
                  />
                </label>
                <label className="field-block">
                  <span className="field-label">講師名</span>
                  <input
                    className="text-input"
                    type="text"
                    value={trial.instructor ?? ""}
                    onChange={(event) => updateTrialLesson("instructor", event.target.value)}
                  />
                </label>
              </div>

              <label className="field-block">
                <span className="field-label">受講日</span>
                <input
                  className="text-input"
                  type="date"
                  value={trial.date ?? ""}
                  onChange={(event) => updateTrialLesson("date", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">受ける前に想像していたこと</span>
                <textarea
                  className="text-area"
                  rows={2}
                  value={trial.expected ?? ""}
                  onChange={(event) => updateTrialLesson("expected", event.target.value)}
                />
              </label>

              <div className="field-block">
                <span className="field-label">実際に受けてどうだったか</span>
                <div className="choice-chips oc-choice-chips">
                  {OC_TRIAL_MATCH_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`choice-chip oc-choice-chip ${trial.match === option.id ? "active" : ""}`}
                      aria-pressed={trial.match === option.id}
                      onClick={() =>
                        updateTrialLesson("match", trial.match === option.id ? undefined : option.id)
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field-block">
                <span className="field-label">授業を受けて気づいたこと</span>
                <textarea
                  className="text-area"
                  rows={3}
                  value={trial.noticed ?? ""}
                  onChange={(event) => updateTrialLesson("noticed", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">感想（任意）</span>
                <textarea
                  className="text-area"
                  rows={3}
                  value={evaluationForm.studentComment}
                  onChange={(event) => updateEvaluationField("studentComment", event.target.value)}
                />
              </label>

              <label className="field-block">
                <span className="field-label">追加メモ（任意）</span>
                <textarea
                  className="text-area"
                  rows={3}
                  value={evaluationForm.familyComment}
                  onChange={(event) => updateEvaluationField("familyComment", event.target.value)}
                />
              </label>
            </div>
          </details>

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

    const { nextPending, warningMessage } = collectPendingAttachments(fileList);

    if (warningMessage) {
      const message = warningMessage;
      setAttachmentWarning(message);
      window.alert(message);
    } else {
      setAttachmentWarning(null);
    }

    if (nextPending.length > 0) {
      setPendingAttachments((current) => [...current, ...nextPending]);
    }
  }

  function collectPendingAttachments(fileList: FileList) {
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

    return {
      nextPending,
      warningMessage: errors.length > 0 ? errors.join("\n") : null,
    };
  }

  async function persistPendingAttachments(ocId: string, attachments: PendingAttachment[]) {
    const savedAttachmentIds: string[] = [];

    try {
      const metas: OpenCampusAttachmentMeta[] = [];

      for (const pendingAttachment of attachments) {
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

  async function rollbackSavedAttachments(attachmentIds: string[]) {
    await Promise.all(attachmentIds.map((id) => deleteAttachmentBlob(id).catch(() => undefined)));
  }

  function openDirectAttachmentPicker(eventId: string) {
    if (!attachmentsAvailable) {
      window.alert("このブラウザでは添付ファイル保存に対応していません。");
      return;
    }

    directAttachmentEventIdRef.current = eventId;
    directAttachmentInputRef.current?.click();
  }

  async function handleDirectAttachmentFiles(fileList: FileList | null) {
    const eventId = directAttachmentEventIdRef.current;
    directAttachmentEventIdRef.current = null;

    if (!fileList || fileList.length === 0 || !eventId) {
      return;
    }

    if (!attachmentsAvailable) {
      window.alert("このブラウザでは添付ファイル保存に対応していません。");
      return;
    }

    const currentEvent = events.find((event) => event.id === eventId);

    if (!currentEvent) {
      const message = "ファイルを追加できませんでした。もう一度お試しください。";
      window.alert(message);
      setDirectAttachmentMessage({
        eventId,
        tone: "error",
        text: message,
      });
      return;
    }

    const { nextPending, warningMessage } = collectPendingAttachments(fileList);

    if (warningMessage) {
      window.alert(warningMessage);
    }

    if (nextPending.length === 0) {
      return;
    }

    try {
      const newAttachmentMetas = await persistPendingAttachments(eventId, nextPending);
      const latestEvents = loadShinromiiStorage().openCampusEvents;
      const latestEvent = latestEvents.find((event) => event.id === eventId);

      if (!latestEvent) {
        await rollbackSavedAttachments(newAttachmentMetas.map((attachment) => attachment.id));
        throw new Error("missing-open-campus-event");
      }

      const nextEvents = latestEvents.map((event) =>
        event.id === eventId
          ? {
              ...event,
              attachments: [...event.attachments, ...newAttachmentMetas],
              updatedAt: todayString(),
            }
          : event,
      );

      try {
        saveOpenCampusEvents(nextEvents);
      } catch {
        await rollbackSavedAttachments(newAttachmentMetas.map((attachment) => attachment.id));
        throw new Error("open-campus-attachment-meta-save-failed");
      }

      setEvents(nextEvents);

      setEventForm((current) =>
        current.id === eventId
          ? {
              ...current,
              attachments: [...current.attachments, ...newAttachmentMetas],
            }
          : current,
      );

      setDirectAttachmentMessage({
        eventId,
        tone: "success",
        text: "ファイルを追加しました。",
      });
    } catch {
      const message = "ファイルを追加できませんでした。もう一度お試しください。";
      window.alert(message);
      setDirectAttachmentMessage({
        eventId,
        tone: "error",
        text: message,
      });
    }
  }

  function handleAddCampusEvaluator(event: OpenCampusEvent) {
    const name = newEvaluatorName.trim();

    if (!name) {
      window.alert("評価する人の名前を入力してください。");
      return;
    }

    const today = todayString();
    const newEvaluatorId = createId("oc-evaluator");
    const nextEvaluator = normalizeCampusEvaluators([
      ...campusEvaluators,
      {
        id: newEvaluatorId,
        name,
        role: "family",
        createdAt: today,
        updatedAt: today,
      },
    ]);

    const nextEvaluatorEntry = nextEvaluator.find((item) => item.id === newEvaluatorId);

    if (!nextEvaluatorEntry) {
      window.alert("評価する人を確認できませんでした。もう一度お試しください。");
      return;
    }

    setCampusEvaluators(nextEvaluator);
    saveCampusEvaluationState(evaluations, nextEvaluator);
    openEvaluationEditor(event, newEvaluatorId, nextEvaluatorEntry);
  }

  async function handleSaveEvent() {
    if (!eventForm.university.trim()) {
      window.alert("大学名を入力してください。");
      return;
    }

    const eventName = eventForm.eventName.trim() || "オープンキャンパス";

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
        ? await persistPendingAttachments(eventForm.id, pendingAttachments)
        : [];

      const nextEvent = normalizeOpenCampusEvent({
        id: eventForm.id,
        university: eventForm.university.trim(),
        facultyDepartment: eventForm.facultyDepartment.trim(),
        eventName,
        eventType: eventForm.eventType.trim() || eventName,
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
        lookFor: eventForm.lookFor,
        lookForOther: eventForm.lookForOther.trim(),
      });

      const nextEvents = editingEventId
        ? events.map((event) => (event.id === editingEventId ? nextEvent : event))
        : [nextEvent, ...events];

      setEvents(nextEvents);
      saveOpenCampusEvents(nextEvents);

      const createdAsDone = !editingEventId && nextEvent.status === "参加済み";

      if (createdAsDone) {
        setSelectedId(null);
        setPendingEvalInviteId(nextEvent.id);
      } else {
        setSelectedId(nextEvent.id);
        setPendingEvalInviteId(null);
      }

      for (const attachmentId of removedAttachmentIds) {
        await deleteAttachmentBlob(attachmentId).catch(() => undefined);
      }

      setPendingAttachments([]);
      setRemovedAttachmentIds([]);
      setDirectAttachmentMessage(null);
      closeEventEditor();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "添付ファイルの保存に失敗しました。";
      window.alert(message);
    }
  }

  function handleSaveEvaluation() {
    if (!editingEvaluationTarget) {
      return;
    }

    const existingEntry = findEvaluationEntry(editingEvaluationTarget.eventId, editingEvaluationTarget.evaluatorId);
    const evaluator =
      findCampusEvaluator(editingEvaluationTarget.evaluatorId) ??
      (existingEntry
        ? {
            id: existingEntry.evaluatorId,
            name: existingEntry.evaluatorName,
            role: existingEntry.evaluatorRole,
            createdAt: existingEntry.createdAt,
            updatedAt: existingEntry.updatedAt,
          }
        : null);

    if (!evaluator) {
      window.alert("評価する人を確認できませんでした。もう一度お試しください。");
      return;
    }

    const nextEvaluation = normalizeCampusEvaluation({
      overall: evaluationForm.overall,
      goodPoint: evaluationForm.goodPoint.trim(),
      badPoint: evaluationForm.badPoint.trim(),
      studentComment: evaluationForm.studentComment.trim(),
      familyComment: evaluationForm.familyComment.trim(),
      freeNote: evaluationForm.freeNote.trim(),
      categoryScores: evaluationForm.categoryScores,
      simpleRatings: evaluationForm.simpleRatings,
      aspiration: evaluationForm.aspiration,
      goodTags: evaluationForm.goodTags,
      goodOther: evaluationForm.goodOther?.trim(),
      concernTags: evaluationForm.concernTags,
      concernOther: evaluationForm.concernOther?.trim(),
      wantToKnow: evaluationForm.wantToKnow?.trim(),
      trialLesson: evaluationForm.trialLesson,
    });

    const nextEntry = normalizeCampusEvaluationEntry({
      ...nextEvaluation,
      id: existingEntry?.id ?? createId("oc-eval"),
      evaluatorId: evaluator.id,
      evaluatorName: evaluator.name,
      evaluatorRole: evaluator.role,
      createdAt: existingEntry?.createdAt ?? todayString(),
      updatedAt: todayString(),
      legacyLabel: existingEntry?.legacyLabel,
    });

    const currentEntries = eventEvaluations(editingEvaluationTarget.eventId);
    const nextEventEvaluations = existingEntry
      ? currentEntries.map((entry) =>
          entry.evaluatorId === editingEvaluationTarget.evaluatorId ? nextEntry : entry,
        )
      : [...currentEntries, nextEntry];
    const nextEvaluations = {
      ...evaluations,
      [editingEvaluationTarget.eventId]: nextEventEvaluations,
    };

    setEvaluations(nextEvaluations);
    saveCampusEvaluationState(nextEvaluations, campusEvaluators);
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

    if (editingEvaluationTarget?.eventId === event.id) {
      closeEvaluationEditor();
    }

    if (evaluationChooserEventId === event.id) {
      setEvaluationChooserEventId(null);
      setNewEvaluatorName("");
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
      <input
        ref={directAttachmentInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          void handleDirectAttachmentFiles(event.target.files);
          event.target.value = "";
        }}
      />
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
          ? renderEventEditor("オープンキャンパスを追加", "これから参加するOCも、すでに参加したOCも記録できます")
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
                {editingEvaluationTarget?.eventId === event.id ? renderEvaluationEditor() : null}
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
                {editingEvaluationTarget?.eventId === event.id ? renderEvaluationEditor() : null}
              </div>
            ))
          )}
        </div>
      </section>

      {skippedEvents.length > 0 ? (
        <section className="list-section">
          <div className="list-section-head">
            <div className="list-section-copy">
              <h2 className="list-section-title">参加しなかったOC</h2>
              <p className="list-section-note">{skippedEvents.length}件</p>
            </div>
          </div>

          <div className="oc-list">
            {skippedEvents.map((event) => (
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
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
