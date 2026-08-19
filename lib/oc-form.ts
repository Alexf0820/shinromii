import type {
  OpenCampusAttachmentMeta,
  OpenCampusEvent,
  OpenCampusLink,
  OpenCampusStatus,
  OcLookForId,
} from "@/data/mockData";
import { normalizeOpenCampusEvent } from "@/lib/oc-record";

export type OpenCampusCreateIntent = "upcoming" | "done";

export type EventFormState = {
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

export function createOcId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyEventForm(): EventFormState {
  return {
    id: createOcId("oc"),
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

export function applyCreateIntent(form: EventFormState, intent: OpenCampusCreateIntent): EventFormState {
  if (intent === "done") {
    return {
      ...form,
      status: "参加済み",
      eventDate: form.eventDate === todayString() ? "" : form.eventDate,
    };
  }

  return {
    ...form,
    status: "予約済み",
    eventDate: form.eventDate || todayString(),
  };
}

export function buildOpenCampusEventFromForm(form: EventFormState, existing?: OpenCampusEvent | null) {
  if (!form.university.trim()) {
    return null;
  }

  const eventName = form.eventName.trim() || "オープンキャンパス";

  return normalizeOpenCampusEvent({
    id: form.id,
    university: form.university.trim(),
    facultyDepartment: form.facultyDepartment.trim(),
    eventName,
    eventType: form.eventType.trim() || eventName,
    eventDate: form.eventDate,
    startTime: form.startTime,
    endTime: form.endTime,
    status: form.status,
    companionMemo: form.companionMemo.trim(),
    meetingPlace: form.meetingPlace.trim(),
    accessMemo: form.accessMemo.trim(),
    dayMemo: form.dayMemo.trim(),
    links: form.links
      .filter((link) => link.label.trim() && link.url.trim())
      .map((link) => ({
        ...link,
        label: link.label.trim(),
        url: link.url.trim(),
        updatedAt: todayString(),
      })),
    attachments: form.attachments,
    createdAt: existing?.createdAt ?? todayString(),
    updatedAt: todayString(),
    lookFor: form.lookFor,
    lookForOther: form.lookForOther.trim(),
  });
}
