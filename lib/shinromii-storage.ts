import { aiNotes, campusDone, gradeRecords, openCampusEvents, qualifications, universities } from "@/data/mockData";
import { normalizeExamScores } from "@/lib/grading-rule";
import type {
  AiNote,
  CampusEvaluation,
  GradeRecord,
  OpenCampusEvent,
  QualificationRecord,
  UniversityCandidate,
} from "@/data/mockData";
import { createEmptyProfile, normalizeUserProfile, type UserProfile } from "@/lib/user-profile";

export const STORAGE_KEY = "SHINROMII::storage::v1";
export const STORAGE_VERSION = 6;
const AI_NOTES_SORT_KEY = "SHINROMII::ai-notes-sort::v1";
const UNIVERSITY_SORT_KEY = "SHINROMII::university-sort::v1";

export type ShinromiiStorage = {
  version: number;
  aiNotes: AiNote[];
  campusEvaluations: Record<string, CampusEvaluation>;
  universityCandidates: UniversityCandidate[];
  gradeRecords: GradeRecord[];
  qualifications: QualificationRecord[];
  openCampusEvents: OpenCampusEvent[];
  profile: UserProfile;
  setupCompleted: boolean;
};

type ShinromiiStorageV1 = {
  version: 1;
  aiNotes: AiNote[];
  campusEvaluations: Record<string, CampusEvaluation>;
};

type ShinromiiStorageV2 = {
  version: 2;
  aiNotes: AiNote[];
  campusEvaluations: Record<string, CampusEvaluation>;
  universityCandidates: UniversityCandidate[];
};

type ShinromiiStorageV3 = {
  version: 3;
  aiNotes: AiNote[];
  campusEvaluations: Record<string, CampusEvaluation>;
  universityCandidates: UniversityCandidate[];
  gradeRecords: GradeRecord[];
  qualifications: QualificationRecord[];
};

type ShinromiiStorageV4 = Omit<ShinromiiStorage, "version" | "profile" | "setupCompleted"> & {
  version: 4;
};

type ShinromiiStorageV5 = Omit<ShinromiiStorage, "version" | "profile" | "setupCompleted"> & {
  version: 5;
};

/** v4までサンプルとして配布していた評定。実データへ置き換えるための目印。 */
const legacyDummyGradeIds = new Set([
  "grade-h2-1-japanese",
  "grade-h2-1-english",
  "grade-h2-1-math",
  "grade-h2-1-info",
  "grade-h1-3-japanese",
  "grade-h1-3-english",
  "grade-h1-3-math",
  "grade-h1-3-biology",
]);

function replaceLegacyDummyGrades(storage: ShinromiiStorage, fallback: ShinromiiStorage): ShinromiiStorage {
  const userRecords = storage.gradeRecords.filter((record) => !legacyDummyGradeIds.has(record.id));

  if (userRecords.length === storage.gradeRecords.length) {
    return storage;
  }

  return {
    ...storage,
    gradeRecords: [...fallback.gradeRecords, ...userRecords],
  };
}

function buildDefaultEvaluations() {
  return campusDone.reduce<Record<string, CampusEvaluation>>((acc, item) => {
    if (item.evaluation) {
      acc[item.id] = item.evaluation;
    }

    return acc;
  }, {});
}

export function buildDefaultStorage(): ShinromiiStorage {
  return {
    version: STORAGE_VERSION,
    aiNotes,
    campusEvaluations: buildDefaultEvaluations(),
    universityCandidates: universities,
    gradeRecords,
    qualifications,
    openCampusEvents,
    profile: createEmptyProfile(),
    setupCompleted: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** 得点は保存時期によって形が違うため、読み込み時に現在の形へそろえる。 */
function normalizeGradeRecords(records: GradeRecord[]): GradeRecord[] {
  return records.map((record) => {
    const scores = normalizeExamScores(record?.scores);
    const next = { ...record };

    if (scores) {
      next.scores = scores;
    } else {
      delete next.scores;
    }

    return next;
  });
}

type CoerceOptions = {
  /** 既存端末の移行時のみ、学年の初期値を高校1年にする。成績データは触らない。 */
  existingInstallation?: boolean;
  /** バックアップ復元。マイ情報が無い古いファイルは未登録のまま読む。 */
  fromBackup?: boolean;
};

function coerceStorageValues(
  parsed: Partial<ShinromiiStorage>,
  fallback: ShinromiiStorage,
  options: CoerceOptions = {},
): ShinromiiStorage {
  const existingInstallation = options.existingInstallation === true;
  const fromBackup = options.fromBackup === true;
  const hasStoredProfile = "profile" in parsed && parsed.profile != null;

  return {
    version: STORAGE_VERSION,
    aiNotes: Array.isArray(parsed.aiNotes) ? parsed.aiNotes : fallback.aiNotes,
    campusEvaluations:
      parsed.campusEvaluations && typeof parsed.campusEvaluations === "object"
        ? parsed.campusEvaluations
        : fallback.campusEvaluations,
    universityCandidates: Array.isArray(parsed.universityCandidates)
      ? parsed.universityCandidates
      : fallback.universityCandidates,
    gradeRecords: Array.isArray(parsed.gradeRecords)
      ? normalizeGradeRecords(parsed.gradeRecords)
      : fallback.gradeRecords,
    qualifications: Array.isArray(parsed.qualifications)
      ? parsed.qualifications
      : fallback.qualifications,
    openCampusEvents: Array.isArray(parsed.openCampusEvents)
      ? parsed.openCampusEvents
      : fallback.openCampusEvents,
    profile: normalizeUserProfile(parsed.profile, {
      defaultSchoolYear: existingInstallation && !hasStoredProfile && !fromBackup ? "high-1" : "",
    }),
    setupCompleted: fromBackup || existingInstallation || parsed.setupCompleted === true,
  };
}

export function parseBackupStorageData(candidate: unknown): ShinromiiStorage | null {
  const fallback = buildDefaultStorage();

  if (!isRecord(candidate)) {
    return null;
  }

  const requiredKeys = [
    "aiNotes",
    "campusEvaluations",
    "universityCandidates",
    "gradeRecords",
    "qualifications",
    "openCampusEvents",
  ] as const;

  const hasRequiredShape = requiredKeys.every((key) => key in candidate);

  if (!hasRequiredShape) {
    return null;
  }

  if (
    !Array.isArray(candidate.aiNotes) ||
    !isRecord(candidate.campusEvaluations) ||
    !Array.isArray(candidate.universityCandidates) ||
    !Array.isArray(candidate.gradeRecords) ||
    !Array.isArray(candidate.qualifications) ||
    !Array.isArray(candidate.openCampusEvents)
  ) {
    return null;
  }

  return coerceStorageValues(candidate as Partial<ShinromiiStorage>, fallback, { fromBackup: true });
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadShinromiiStorage(): ShinromiiStorage {
  const fallback = buildDefaultStorage();

  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<
      | ShinromiiStorage
      | ShinromiiStorageV1
      | ShinromiiStorageV2
      | ShinromiiStorageV3
      | ShinromiiStorageV4
      | ShinromiiStorageV5
    >;

    if (parsed.version === 1) {
      return coerceStorageValues(parsed as Partial<ShinromiiStorageV1>, fallback, {
        existingInstallation: true,
      });
    }

    if (parsed.version === 2) {
      return coerceStorageValues(parsed as Partial<ShinromiiStorageV2>, fallback, {
        existingInstallation: true,
      });
    }

    if (parsed.version === 3) {
      return replaceLegacyDummyGrades(
        coerceStorageValues(parsed as Partial<ShinromiiStorageV3>, fallback, {
          existingInstallation: true,
        }),
        fallback,
      );
    }

    if (parsed.version === 4) {
      return replaceLegacyDummyGrades(
        coerceStorageValues(parsed as Partial<ShinromiiStorageV4>, fallback, {
          existingInstallation: true,
        }),
        fallback,
      );
    }

    if (parsed.version === 5) {
      return coerceStorageValues(parsed as Partial<ShinromiiStorageV5>, fallback, {
        existingInstallation: true,
      });
    }

    if (parsed.version !== STORAGE_VERSION) {
      return fallback;
    }

    return coerceStorageValues(parsed as Partial<ShinromiiStorage>, fallback);
  } catch {
    return fallback;
  }
}

export function saveShinromiiStorage(next: ShinromiiStorage) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      aiNotes: next.aiNotes,
      campusEvaluations: next.campusEvaluations,
      universityCandidates: next.universityCandidates,
      gradeRecords: next.gradeRecords,
      qualifications: next.qualifications,
      openCampusEvents: next.openCampusEvents,
      profile: next.profile,
      setupCompleted: next.setupCompleted,
    }),
  );
}

export function hasExistingShinromiiInstallation() {
  return canUseStorage() && window.localStorage.getItem(STORAGE_KEY) !== null;
}

/** ストレージキーがある端末は既存ユーザー。新規でキーが無いときだけ初回セットアップを案内する。 */
export function shouldShowFirstSetup() {
  return canUseStorage() && window.localStorage.getItem(STORAGE_KEY) === null;
}

export function saveUserProfile(profile: UserProfile, setupCompleted = true) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    profile: normalizeUserProfile(profile),
    setupCompleted,
  });
}

export function markSetupFinished(profile?: UserProfile) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    profile: normalizeUserProfile(profile ?? current.profile),
    setupCompleted: true,
  });
}

export function saveAiNotes(nextAiNotes: AiNote[]) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    aiNotes: nextAiNotes,
  });
}

export function saveCampusEvaluation(campusId: string, evaluation: CampusEvaluation) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    campusEvaluations: {
      ...current.campusEvaluations,
      [campusId]: evaluation,
    },
  });
}

export function saveCampusEvaluations(nextEvaluations: Record<string, CampusEvaluation>) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    campusEvaluations: nextEvaluations,
  });
}

export function saveUniversityCandidates(nextCandidates: UniversityCandidate[]) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    universityCandidates: nextCandidates,
  });
}

export function saveGradeRecords(nextGradeRecords: GradeRecord[]) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    gradeRecords: nextGradeRecords,
  });
}

export function saveQualifications(nextQualifications: QualificationRecord[]) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    qualifications: nextQualifications,
  });
}

export function saveOpenCampusEvents(nextOpenCampusEvents: OpenCampusEvent[]) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    openCampusEvents: nextOpenCampusEvents,
  });
}

export type AiNotesSortOrder = "newest" | "oldest" | "helpful";

export function loadAiNotesSortOrder(): AiNotesSortOrder {
  if (!canUseStorage()) {
    return "newest";
  }

  const stored = window.localStorage.getItem(AI_NOTES_SORT_KEY);

  if (stored === "oldest" || stored === "helpful" || stored === "newest") {
    return stored;
  }

  return "newest";
}

export function saveAiNotesSortOrder(sortOrder: AiNotesSortOrder) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AI_NOTES_SORT_KEY, sortOrder);
}

export type UniversitySortOrder = "interest" | "newest" | "oldest" | "name";

export function loadUniversitySortOrder(): UniversitySortOrder {
  if (!canUseStorage()) {
    return "interest";
  }

  const stored = window.localStorage.getItem(UNIVERSITY_SORT_KEY);

  if (stored === "newest" || stored === "oldest" || stored === "name" || stored === "interest") {
    return stored;
  }

  return "interest";
}

export function saveUniversitySortOrder(sortOrder: UniversitySortOrder) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(UNIVERSITY_SORT_KEY, sortOrder);
}
