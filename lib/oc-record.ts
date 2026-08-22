import type {
  CampusEvaluation,
  CampusEvaluationEntry,
  CampusEvaluator,
  CampusEvaluatorRole,
  OcAspiration,
  OcLookForId,
  OcPointTagId,
  OcSimpleMark,
  OcSimpleRatings,
  OcTrialLesson,
  OcTrialMatch,
  OpenCampusEvent,
} from "@/data/mockData";
import { createShinromiiId } from "@/lib/shinromii-id";

export const OC_LOOK_FOR_OPTIONS: { id: OcLookForId; label: string }[] = [
  { id: "class", label: "授業・学び" },
  { id: "faculty", label: "学部の内容" },
  { id: "students", label: "学生の雰囲気" },
  { id: "campus", label: "校舎" },
  { id: "facility", label: "施設・設備" },
  { id: "access", label: "通いやすさ" },
  { id: "career", label: "就職" },
  { id: "english", label: "留学・英語" },
  { id: "exam", label: "入試" },
  { id: "other", label: "その他" },
];

export const OC_POINT_TAG_OPTIONS: { id: OcPointTagId; label: string }[] = [
  { id: "class", label: "授業" },
  { id: "faculty", label: "学部" },
  { id: "students", label: "学生" },
  { id: "campus", label: "校舎" },
  { id: "facility", label: "施設" },
  { id: "teacher", label: "先生" },
  { id: "career", label: "就職" },
  { id: "english", label: "留学・英語" },
  { id: "access", label: "アクセス" },
  { id: "other", label: "その他" },
];

export const OC_SIMPLE_MARKS: OcSimpleMark[] = ["great", "good", "ok", "poor"];

export const OC_CAMPUS_MARK_LABELS: Record<OcSimpleMark, string> = {
  great: "◎ とても良い",
  good: "○ 良い",
  ok: "△ 普通",
  poor: "× 微妙",
};

export const OC_STUDENT_MARK_LABELS: Record<OcSimpleMark, string> = {
  great: "◎ 好き",
  good: "○ 良い",
  ok: "△ 普通",
  poor: "× 合わない",
};

export const OC_LEARNING_MARK_LABELS: Record<OcSimpleMark, string> = {
  great: "◎ 興味が増えた",
  good: "○ 良かった",
  ok: "△ 変わらない",
  poor: "× 少し違った",
};

export const OC_ACCESS_MARK_LABELS: Record<OcSimpleMark, string> = {
  great: "◎ 問題なし",
  good: "○ 許容範囲",
  ok: "△ 少し大変",
  poor: "× 大変そう",
};

export const OC_ASPIRATION_OPTIONS: { id: OcAspiration; label: string }[] = [
  { id: "want", label: "かなり行きたい" },
  { id: "keep", label: "候補に残す" },
  { id: "unsure", label: "まだ分からない" },
  { id: "drop", label: "候補から外す" },
];

export const OC_TRIAL_MATCH_OPTIONS: { id: OcTrialMatch; label: string }[] = [
  { id: "as_expected", label: "想像どおり" },
  { id: "unexpected", label: "予想外" },
];

const LOOK_FOR_IDS = new Set(OC_LOOK_FOR_OPTIONS.map((item) => item.id));
const POINT_TAG_IDS = new Set(OC_POINT_TAG_OPTIONS.map((item) => item.id));
const SIMPLE_MARKS = new Set(OC_SIMPLE_MARKS);
const ASPIRATIONS = new Set(OC_ASPIRATION_OPTIONS.map((item) => item.id));
const TRIAL_MATCHES = new Set(OC_TRIAL_MATCH_OPTIONS.map((item) => item.id));
const CAMPUS_EVALUATOR_ROLES = new Set<CampusEvaluatorRole>(["self", "guardian", "family", "other", "legacy"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function lookForLabel(id: string) {
  return OC_LOOK_FOR_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export function pointTagLabel(id: string) {
  return OC_POINT_TAG_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export function aspirationLabel(id: OcAspiration) {
  return OC_ASPIRATION_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export function campusEvaluatorRoleLabel(role: CampusEvaluatorRole) {
  if (role === "self") {
    return "本人";
  }

  if (role === "guardian") {
    return "保護者";
  }

  if (role === "family") {
    return "家族";
  }

  if (role === "legacy") {
    return "以前の評価";
  }

  return "その他";
}

function fallbackEvaluatorName(role: CampusEvaluatorRole) {
  return campusEvaluatorRoleLabel(role);
}

function isCampusEvaluatorRole(value: unknown): value is CampusEvaluatorRole {
  return typeof value === "string" && CAMPUS_EVALUATOR_ROLES.has(value as CampusEvaluatorRole);
}

export function createDefaultCampusEvaluators(createdAt = todayString()): CampusEvaluator[] {
  return [
    {
      id: createShinromiiId("oc-evaluator"),
      name: "本人",
      role: "self",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: createShinromiiId("oc-evaluator"),
      name: "保護者",
      role: "guardian",
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export function normalizeCampusEvaluator(evaluator: CampusEvaluator): CampusEvaluator {
  const role = isCampusEvaluatorRole(evaluator.role) ? evaluator.role : "other";
  const name = typeof evaluator.name === "string" && evaluator.name.trim() ? evaluator.name.trim() : fallbackEvaluatorName(role);
  const createdAt = typeof evaluator.createdAt === "string" && evaluator.createdAt ? evaluator.createdAt : todayString();
  const updatedAt = typeof evaluator.updatedAt === "string" && evaluator.updatedAt ? evaluator.updatedAt : createdAt;

  return {
    id: typeof evaluator.id === "string" && evaluator.id ? evaluator.id : createShinromiiId("oc-evaluator"),
    name,
    role,
    createdAt,
    updatedAt,
  };
}

export function normalizeCampusEvaluators(evaluators: CampusEvaluator[] | undefined) {
  const next = Array.isArray(evaluators)
    ? evaluators.filter(isRecord).map((evaluator) => normalizeCampusEvaluator(evaluator as CampusEvaluator))
    : [];

  if (!next.some((evaluator) => evaluator.role === "self")) {
    next.push(createDefaultCampusEvaluators()[0]);
  }

  if (!next.some((evaluator) => evaluator.role === "guardian")) {
    next.push(createDefaultCampusEvaluators()[1]);
  }

  return next;
}

export function createLegacyCampusEvaluationEntry(eventId: string, evaluation: CampusEvaluation): CampusEvaluationEntry {
  const now = todayString();

  return normalizeCampusEvaluationEntry({
    ...evaluation,
    id: createShinromiiId("oc-eval"),
    evaluatorId: `legacy-${eventId}`,
    evaluatorName: "以前の評価",
    evaluatorRole: "legacy",
    createdAt: now,
    updatedAt: now,
    legacyLabel: "以前の評価",
  });
}

export function toggleIdList<T extends string>(current: T[], id: T) {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

export function createEmptyEvaluation(): CampusEvaluation {
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

function asStringList(value: unknown, allowed: Set<string>) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const next = value.filter((item): item is string => typeof item === "string" && allowed.has(item));
  return next.length > 0 ? next : undefined;
}

function asSimpleMark(value: unknown): OcSimpleMark | undefined {
  return typeof value === "string" && SIMPLE_MARKS.has(value as OcSimpleMark)
    ? (value as OcSimpleMark)
    : undefined;
}

function normalizeSimpleRatings(value: unknown): OcSimpleRatings | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const next: OcSimpleRatings = {};
  const campus = asSimpleMark(record.campus);
  const students = asSimpleMark(record.students);
  const learning = asSimpleMark(record.learning);
  const access = asSimpleMark(record.access);

  if (campus) {
    next.campus = campus;
  }

  if (students) {
    next.students = students;
  }

  if (learning) {
    next.learning = learning;
  }

  if (access) {
    next.access = access;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeTrialLesson(value: unknown): OcTrialLesson | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const next: OcTrialLesson = {};

  if (typeof record.courseName === "string" && record.courseName.trim()) {
    next.courseName = record.courseName.trim();
  }

  if (typeof record.instructor === "string" && record.instructor.trim()) {
    next.instructor = record.instructor.trim();
  }

  if (typeof record.date === "string" && record.date.trim()) {
    next.date = record.date.trim();
  }

  if (typeof record.expected === "string" && record.expected.trim()) {
    next.expected = record.expected.trim();
  }

  if (typeof record.match === "string" && TRIAL_MATCHES.has(record.match as OcTrialMatch)) {
    next.match = record.match as OcTrialMatch;
  }

  if (typeof record.noticed === "string" && record.noticed.trim()) {
    next.noticed = record.noticed.trim();
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function normalizeOpenCampusEvent(event: OpenCampusEvent): OpenCampusEvent {
  const next = { ...event };
  const lookFor = asStringList(event.lookFor, LOOK_FOR_IDS) as OcLookForId[] | undefined;
  const lookForOther = typeof event.lookForOther === "string" ? event.lookForOther.trim() : "";

  if (lookFor) {
    next.lookFor = lookFor;
  } else {
    delete next.lookFor;
  }

  if (lookFor?.includes("other") && lookForOther) {
    next.lookForOther = lookForOther;
  } else {
    delete next.lookForOther;
  }

  return next;
}

export function normalizeCampusEvaluation(evaluation: CampusEvaluation): CampusEvaluation {
  const next: CampusEvaluation = {
    ...evaluation,
    categoryScores: {
      atmosphere: evaluation.categoryScores?.atmosphere ?? null,
      curriculum: evaluation.categoryScores?.curriculum ?? null,
      students: evaluation.categoryScores?.students ?? null,
      access: evaluation.categoryScores?.access ?? null,
      career: evaluation.categoryScores?.career ?? null,
    },
  };

  const simpleRatings = normalizeSimpleRatings(evaluation.simpleRatings);
  const goodTags = asStringList(evaluation.goodTags, POINT_TAG_IDS) as OcPointTagId[] | undefined;
  const concernTags = asStringList(evaluation.concernTags, POINT_TAG_IDS) as OcPointTagId[] | undefined;
  const trialLesson = normalizeTrialLesson(evaluation.trialLesson);
  const aspiration =
    typeof evaluation.aspiration === "string" && ASPIRATIONS.has(evaluation.aspiration)
      ? evaluation.aspiration
      : undefined;
  const goodOther = typeof evaluation.goodOther === "string" ? evaluation.goodOther.trim() : "";
  const concernOther = typeof evaluation.concernOther === "string" ? evaluation.concernOther.trim() : "";
  const wantToKnow = typeof evaluation.wantToKnow === "string" ? evaluation.wantToKnow.trim() : "";

  if (simpleRatings) {
    next.simpleRatings = simpleRatings;
  } else {
    delete next.simpleRatings;
  }

  if (aspiration) {
    next.aspiration = aspiration;
  } else {
    delete next.aspiration;
  }

  if (goodTags) {
    next.goodTags = goodTags;
  } else {
    delete next.goodTags;
  }

  if (goodTags?.includes("other") && goodOther) {
    next.goodOther = goodOther;
  } else {
    delete next.goodOther;
  }

  if (concernTags) {
    next.concernTags = concernTags;
  } else {
    delete next.concernTags;
  }

  if (concernTags?.includes("other") && concernOther) {
    next.concernOther = concernOther;
  } else {
    delete next.concernOther;
  }

  if (wantToKnow) {
    next.wantToKnow = wantToKnow;
  } else {
    delete next.wantToKnow;
  }

  if (trialLesson) {
    next.trialLesson = trialLesson;
  } else {
    delete next.trialLesson;
  }

  return next;
}

export function normalizeCampusEvaluationEntry(entry: CampusEvaluationEntry): CampusEvaluationEntry {
  const normalized = normalizeCampusEvaluation(entry);
  const evaluatorRole = isCampusEvaluatorRole(entry.evaluatorRole) ? entry.evaluatorRole : "other";
  const evaluatorName =
    typeof entry.evaluatorName === "string" && entry.evaluatorName.trim()
      ? entry.evaluatorName.trim()
      : fallbackEvaluatorName(evaluatorRole);
  const createdAt = typeof entry.createdAt === "string" && entry.createdAt ? entry.createdAt : todayString();
  const updatedAt = typeof entry.updatedAt === "string" && entry.updatedAt ? entry.updatedAt : createdAt;
  const legacyLabel = typeof entry.legacyLabel === "string" && entry.legacyLabel.trim() ? entry.legacyLabel.trim() : undefined;

  return {
    ...normalized,
    id: typeof entry.id === "string" && entry.id ? entry.id : createShinromiiId("oc-eval"),
    evaluatorId: typeof entry.evaluatorId === "string" && entry.evaluatorId ? entry.evaluatorId : createShinromiiId("oc-evaluator"),
    evaluatorName,
    evaluatorRole,
    createdAt,
    updatedAt,
    ...(legacyLabel ? { legacyLabel } : {}),
  };
}

export function normalizeCampusEvaluationEntries(
  eventId: string,
  value: CampusEvaluation | CampusEvaluationEntry[] | undefined,
): CampusEvaluationEntry[] {
  if (Array.isArray(value)) {
    return value
      .filter(isRecord)
      .map((entry) => normalizeCampusEvaluationEntry(entry as CampusEvaluationEntry));
  }

  if (isRecord(value)) {
    return [createLegacyCampusEvaluationEntry(eventId, value as CampusEvaluation)];
  }

  return [];
}

export function normalizeCampusEvaluations(
  evaluations: Record<string, CampusEvaluation | CampusEvaluationEntry[]>,
) {
  return Object.fromEntries(
    Object.entries(evaluations).map(([id, evaluation]) => [id, normalizeCampusEvaluationEntries(id, evaluation)]),
  );
}

export function hasCategoryScores(evaluation: CampusEvaluation) {
  return Object.values(evaluation.categoryScores ?? {}).some((value) => value != null);
}

const EVENT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const EVENT_TIME_PATTERN = /^(\d{2}):(\d{2})$/;

function parseEventDateParts(value: string) {
  const match = EVENT_DATE_PATTERN.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return { year, month, day };
}

function parseEventTimeParts(value: string) {
  const match = EVENT_TIME_PATTERN.exec(value.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

/**
 * 予約済みOCの参加確認を出すか。日付を過ぎただけでは参加済みにしない。
 * 終了時刻があればその後。日付のみ、または開始のみで終了が無い場合は翌日から。
 * 日付が無い／不正な場合は出さない（手動変更に任せる）。dayMemo は見ない。
 */
export function shouldAskOpenCampusAttendance(
  event: Pick<OpenCampusEvent, "status" | "eventDate" | "startTime" | "endTime">,
  now = new Date(),
) {
  if (event.status !== "予約済み") {
    return false;
  }

  const dateParts = parseEventDateParts(event.eventDate);

  if (!dateParts) {
    return false;
  }

  const endParts = parseEventTimeParts(event.endTime);

  if (endParts) {
    const endedAt = new Date(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      endParts.hours,
      endParts.minutes,
      0,
      0,
    );

    return now.getTime() > endedAt.getTime();
  }

  const nextDay = new Date(dateParts.year, dateParts.month - 1, dateParts.day + 1, 0, 0, 0, 0);

  return now.getTime() >= nextDay.getTime();
}

/** 大学候補名 → OC → 評価。大学候補ページからの参照用。 */
export function openCampusRecordsForUniversity(
  events: OpenCampusEvent[],
  evaluations: Record<string, CampusEvaluationEntry[]>,
  university: string,
) {
  const name = university.trim();

  return events
    .filter((event) => event.university === name)
    .map((event) => ({
      event,
      evaluations: evaluations[event.id] ?? [],
      overall: evaluations[event.id]?.[0]?.overall ?? null,
    }));
}
