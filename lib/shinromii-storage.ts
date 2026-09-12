import { normalizePeriodSystem, type GradePeriodSystem } from "@/lib/grade-periods";
import { normalizeSchoolSubjectsTemplate, getSchoolSubjectsTemplate, type SchoolSubjectsTemplate } from "@/lib/school-subject-templates";
import { isDemoMode, scopedStorageKey } from "@/lib/shinromii-demo-mode";
import { createDemoSample, upgradeDemoPeriods } from "@/lib/shinromii-demo-sample";
import { aiNotes, campusDone, gradeRecords, openCampusEvents, qualifications, universities } from "@/data/mockData";
import { normalizeEikenScores } from "@/lib/eiken";
import { normalizeExamScores } from "@/lib/grading-rule";
import { ensureAugust22OpenCampusPlans, migrateLegacyDummyOpenCampus } from "@/lib/oc-dummy-migration";
import {
  normalizeCampusEvaluation,
  normalizeCampusEvaluationEntries,
  normalizeCampusEvaluators,
  normalizeCampusEvaluations,
  normalizeOpenCampusEvent,
  createDefaultCampusEvaluators,
} from "@/lib/oc-record";
import { migrateLegacyDummyQualifications } from "@/lib/qualification-dummy-migration";
import { migrateLegacyDummyUniversities } from "@/lib/university-dummy-migration";
import { attachUniversityMasterIds, normalizeUniversityCandidate } from "@/lib/university-candidate";
import {
  createDefaultIdentity,
  normalizeAiNoteMeta,
  normalizeCampusEvaluationMeta,
  normalizeCampusEvaluationEntryMeta,
  normalizeGradeRecordMeta,
  normalizeIdentity,
  normalizeOpenCampusEventMeta,
  normalizeQualificationMeta,
  normalizeUniversityCandidateMeta,
  signInIdentity,
  signOutIdentity,
  syncStudentProfileDisplayName,
  type AuthMethod,
  type ShinromiiIdentity,
} from "@/lib/shinromii-identity";
import { recordAutosaveSnapshot } from "@/lib/shinromii-autosave";
import type {
  AiNote,
  CampusEvaluation,
  CampusEvaluationEntry,
  CampusEvaluator,
  GradeRecord,
  OpenCampusEvent,
  QualificationRecord,
  UniversityCandidate,
} from "@/data/mockData";
import { createEmptyProfile, normalizeUserProfile, type UserProfile } from "@/lib/user-profile";

export const STORAGE_KEY = "SHINROMII::storage::v1";
export const STORAGE_VERSION = 9;
export const STORAGE_UPDATED_EVENT = "shinromii:storage-updated";
const AI_NOTES_SORT_KEY = "SHINROMII::ai-notes-sort::v1";
const UNIVERSITY_SORT_KEY = "SHINROMII::university-sort::v1";

export type ShinromiiStorage = {
  version: number;
  aiNotes: AiNote[];
  campusEvaluators: CampusEvaluator[];
  campusEvaluations: Record<string, CampusEvaluationEntry[]>;
  universityCandidates: UniversityCandidate[];
  gradeRecords: GradeRecord[];
  qualifications: QualificationRecord[];
  openCampusEvents: OpenCampusEvent[];
  profile: UserProfile;
  setupCompleted: boolean;
  identity: ShinromiiIdentity;
  /** 明示されたデモ用ノートのみ、既定OCの自動追加を抑止する。 */
  meta?: { isSample: true; demoPeriodsVersion?: 2 };
  gradePeriodSystem?: GradePeriodSystem;
  schoolSubjects?: SchoolSubjectsTemplate;
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

type ShinromiiStorageV6 = Omit<ShinromiiStorage, "version" | "identity"> & {
  version: 6;
};

type ShinromiiStorageV7 = Omit<ShinromiiStorage, "version" | "campusEvaluators" | "campusEvaluations"> & {
  version: 7;
  campusEvaluations: Record<string, CampusEvaluation>;
};

type ShinromiiStorageV8 = Omit<ShinromiiStorage, "version"> & {
  version: 8;
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
  return campusDone.reduce<Record<string, CampusEvaluationEntry[]>>((acc, item) => {
    if (item.evaluation) {
      acc[item.id] = normalizeCampusEvaluationEntries(item.id, item.evaluation);
    }

    return acc;
  }, {});
}

export function buildDefaultStorage(): ShinromiiStorage {
  if (isDemoMode()) return createDemoSample();
  const profile = createEmptyProfile();
  const identity = createDefaultIdentity(profile);
  const currentStudentProfileId = identity.session.currentStudentProfileId;
  const campusEvaluators = createDefaultCampusEvaluators();

  return {
    version: STORAGE_VERSION,
    aiNotes: aiNotes.map((note) => normalizeAiNoteMeta(note, currentStudentProfileId)),
    campusEvaluators,
    campusEvaluations: Object.fromEntries(
      Object.entries(buildDefaultEvaluations()).map(([key, value]) => [
        key,
        value.map((entry) => normalizeCampusEvaluationEntryMeta(entry, currentStudentProfileId)),
      ]),
    ),
    universityCandidates: attachUniversityMasterIds(universities).records.map((record) =>
      normalizeUniversityCandidateMeta(normalizeUniversityCandidate(record), currentStudentProfileId),
    ),
    gradeRecords: gradeRecords.map((record) => normalizeGradeRecordMeta(record, currentStudentProfileId)),
    qualifications: qualifications.map((record) => normalizeQualificationMeta(record, currentStudentProfileId)),
    openCampusEvents: openCampusEvents.map((event) =>
      normalizeOpenCampusEventMeta(normalizeOpenCampusEvent(event), currentStudentProfileId),
    ),
    profile,
    identity,
    setupCompleted: false,
  };
}

/** 新規ユーザーの最初の保存用。配布シードは入れない。 */
export function createBlankShinromiiStorage(): ShinromiiStorage {
  const profile = createEmptyProfile();
  const identity = createDefaultIdentity(profile);

  return {
    version: STORAGE_VERSION,
    aiNotes: [],
    campusEvaluators: createDefaultCampusEvaluators(),
    campusEvaluations: {},
    universityCandidates: [],
    gradeRecords: [],
    qualifications: [],
    openCampusEvents: [],
    profile,
    identity,
    setupCompleted: false,
  };
}

/** キーが無い端末への書き込みは空のノートから始める。既存キーは従来どおり読む。 */
function loadStorageForMutation(): ShinromiiStorage {
  if (!canUseStorage() || window.localStorage.getItem(scopedStorageKey(STORAGE_KEY)) === null) {
    return createBlankShinromiiStorage();
  }

  return loadShinromiiStorage();
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

/** 英検スコアは後から足した任意項目。無い古いデータはそのまま読む。 */
function normalizeQualifications(records: QualificationRecord[]): QualificationRecord[] {
  return records.map((record) => {
    const next: QualificationRecord = {
      ...record,
      examDate: typeof record?.examDate === "string" ? record.examDate : "",
    };
    const eikenScores = normalizeEikenScores(record?.eikenScores);

    if (eikenScores) {
      next.eikenScores = eikenScores;
    } else {
      delete next.eikenScores;
    }

    if (record?.kind === "eiken") {
      next.kind = "eiken";
    } else {
      delete next.kind;
    }

    return next;
  });
}

function normalizeAiNotes(records: AiNote[]): AiNote[] {
  return records.flatMap((record) => {
    if (!record || typeof record !== "object" || typeof record.id !== "string") {
      return [];
    }

    const sourceKind =
      record.sourceKind === "family" ||
      record.sourceKind === "school" ||
      record.sourceKind === "cram" ||
      record.sourceKind === "ai" ||
      record.sourceKind === "other"
        ? record.sourceKind
        : "ai";
    const normalizedProvider =
      typeof record.provider === "string" && record.provider.trim().length > 0 ? record.provider.trim() : "";

    const sourceName =
      typeof record.sourceName === "string" && record.sourceName.trim().length > 0
        ? record.sourceName.trim()
        : sourceKind === "ai"
          ? normalizedProvider
          : "";

    return [
      {
        ...record,
        sourceKind,
        sourceName,
      },
    ];
  });
}

function normalizeCampusEvaluationsForStudent(
  evaluations: Record<string, CampusEvaluation | CampusEvaluationEntry[]>,
  studentProfileId: string,
): Record<string, CampusEvaluationEntry[]> {
  return Object.fromEntries(
    Object.entries(normalizeCampusEvaluations(evaluations)).map(([key, value]) => [
      key,
      value.map((entry) => normalizeCampusEvaluationEntryMeta(entry, studentProfileId)),
    ]),
  );
}

function storageSnapshotPayload(storage: ShinromiiStorage) {
  return {
    version: STORAGE_VERSION,
    aiNotes: storage.aiNotes,
    campusEvaluators: storage.campusEvaluators,
    campusEvaluations: storage.campusEvaluations,
    universityCandidates: storage.universityCandidates,
    gradeRecords: storage.gradeRecords,
    qualifications: storage.qualifications,
    openCampusEvents: storage.openCampusEvents,
    profile: storage.profile,
    setupCompleted: storage.setupCompleted,
    identity: storage.identity,
    ...(storage.gradePeriodSystem !== undefined ? { gradePeriodSystem: normalizePeriodSystem(storage.gradePeriodSystem) } : {}),
    ...(normalizeSchoolSubjectsTemplate(storage.schoolSubjects) ? { schoolSubjects: normalizeSchoolSubjectsTemplate(storage.schoolSubjects) } : {}),
    ...(storage.meta?.isSample === true ? { meta: { isSample: true as const, ...(storage.meta?.demoPeriodsVersion === 2 ? { demoPeriodsVersion: 2 as const } : {}) } } : {}),
  };
}

type CoerceOptions = {
  /** 既存端末の移行時のみ、学年の初期値を高校1年にする。成績データは触らない。 */
  existingInstallation?: boolean;
  /** バックアップ復元。マイ情報が無い古いファイルは未登録のまま読む。 */
  fromBackup?: boolean;
};

type PartialShinromiiStorageLike = Omit<
  Partial<ShinromiiStorage>,
  "campusEvaluators" | "campusEvaluations"
> & {
  campusEvaluators?: CampusEvaluator[];
  campusEvaluations?: Record<string, CampusEvaluation | CampusEvaluationEntry[]>;
};

function coerceStorageValues(
  parsed: PartialShinromiiStorageLike,
  fallback: ShinromiiStorage,
  options: CoerceOptions = {},
): ShinromiiStorage {
  const existingInstallation = options.existingInstallation === true;
  const fromBackup = options.fromBackup === true;
  const hasStoredProfile = "profile" in parsed && parsed.profile != null;
  const profile = normalizeUserProfile(parsed.profile, {
    defaultSchoolYear: existingInstallation && !hasStoredProfile && !fromBackup ? "high-1" : "",
  });
  const identity = normalizeIdentity(parsed.identity, profile);
  const currentStudentProfileId = identity.session.currentStudentProfileId;

  return {
    version: STORAGE_VERSION,
    aiNotes: Array.isArray(parsed.aiNotes)
      ? normalizeAiNotes(parsed.aiNotes).map((record) => normalizeAiNoteMeta(record, currentStudentProfileId))
      : fallback.aiNotes,
    campusEvaluators: Array.isArray(parsed.campusEvaluators)
      ? normalizeCampusEvaluators(parsed.campusEvaluators as CampusEvaluator[])
      : fallback.campusEvaluators,
    campusEvaluations:
      parsed.campusEvaluations && typeof parsed.campusEvaluations === "object"
        ? normalizeCampusEvaluationsForStudent(
            parsed.campusEvaluations as Record<string, CampusEvaluation | CampusEvaluationEntry[]>,
            currentStudentProfileId,
          )
        : fallback.campusEvaluations,
    universityCandidates: Array.isArray(parsed.universityCandidates)
      ? parsed.universityCandidates.map((record) =>
          normalizeUniversityCandidateMeta(normalizeUniversityCandidate(record), currentStudentProfileId),
        )
      : fallback.universityCandidates,
    gradeRecords: Array.isArray(parsed.gradeRecords)
      ? normalizeGradeRecords(parsed.gradeRecords).map((record) =>
          normalizeGradeRecordMeta(record, currentStudentProfileId),
        )
      : fallback.gradeRecords,
    qualifications: Array.isArray(parsed.qualifications)
      ? normalizeQualifications(parsed.qualifications).map((record) =>
          normalizeQualificationMeta(record, currentStudentProfileId),
        )
      : fallback.qualifications,
    openCampusEvents: Array.isArray(parsed.openCampusEvents)
      ? parsed.openCampusEvents.map((event) =>
          normalizeOpenCampusEventMeta(normalizeOpenCampusEvent(event), currentStudentProfileId),
        )
      : fallback.openCampusEvents,
    profile,
    setupCompleted: fromBackup || existingInstallation || parsed.setupCompleted === true,
    identity,
    ...(parsed.gradePeriodSystem !== undefined ? { gradePeriodSystem: normalizePeriodSystem(parsed.gradePeriodSystem) } : {}),
    ...(normalizeSchoolSubjectsTemplate(parsed.schoolSubjects) ? { schoolSubjects: normalizeSchoolSubjectsTemplate(parsed.schoolSubjects) } : {}),
    ...(parsed.meta?.isSample === true ? { meta: { isSample: true as const, ...(parsed.meta?.demoPeriodsVersion === 2 ? { demoPeriodsVersion: 2 as const } : {}) } } : {}),
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

function applyStorageMaintenanceMigrations(storage: ShinromiiStorage): {
  storage: ShinromiiStorage;
  changed: boolean;
} {
  if (isDemoMode()) return { storage, changed: false };

  const migratedQualifications = migrateLegacyDummyQualifications(storage.qualifications);
  const migratedUniversities = migrateLegacyDummyUniversities(storage.universityCandidates);
  const linkedUniversities = attachUniversityMasterIds(migratedUniversities.records);
  const migratedOpenCampus = migrateLegacyDummyOpenCampus(
    storage.openCampusEvents,
    storage.campusEvaluations,
  );
  const plannedOpenCampus = storage.meta?.isSample === true
    ? { events: migratedOpenCampus.events, changed: false }
    : ensureAugust22OpenCampusPlans(migratedOpenCampus.events);

  if (
    !migratedQualifications.changed &&
    !migratedUniversities.changed &&
    !linkedUniversities.changed &&
    !migratedOpenCampus.changed &&
    !plannedOpenCampus.changed
  ) {
    return { storage, changed: false };
  }

  return {
    changed: true,
    storage: {
      ...storage,
      campusEvaluators: normalizeCampusEvaluators(storage.campusEvaluators),
      qualifications: migratedQualifications.records,
      universityCandidates: linkedUniversities.records.map((record) => normalizeUniversityCandidate(record)),
      openCampusEvents: plannedOpenCampus.events.map((event) => normalizeOpenCampusEvent(event)),
      campusEvaluations: normalizeCampusEvaluations(migratedOpenCampus.evaluations),
    },
  };
}

function persistStorageMaintenanceMigrations(
  storage: ShinromiiStorage,
  changedBeforeMaintenance = false,
): ShinromiiStorage {
  const upgraded = isDemoMode() ? upgradeDemoPeriods(storage) : storage;
  changedBeforeMaintenance ||= upgraded !== storage;
  const result = applyStorageMaintenanceMigrations(upgraded);

  if (!result.changed && !changedBeforeMaintenance) {
    return storage;
  }

  saveShinromiiStorage(result.storage);
  return result.storage;
}

function readShinromiiStorageInternal(options: { persistMaintenanceMigrations: boolean }): ShinromiiStorage {
  const fallback = buildDefaultStorage();

  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(STORAGE_KEY));

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
      | ShinromiiStorageV6
      | ShinromiiStorageV7
      | ShinromiiStorageV8
    >;

    if (parsed.version === 1) {
      const changedBeforeMaintenance = true;
      const next = coerceStorageValues(parsed as Partial<ShinromiiStorageV1>, fallback, {
        existingInstallation: true,
      });

      return options.persistMaintenanceMigrations
        ? persistStorageMaintenanceMigrations(next, changedBeforeMaintenance)
        : next;
    }

    if (parsed.version === 2) {
      const changedBeforeMaintenance = true;
      const next = coerceStorageValues(parsed as Partial<ShinromiiStorageV2>, fallback, {
        existingInstallation: true,
      });

      return options.persistMaintenanceMigrations
        ? persistStorageMaintenanceMigrations(next, changedBeforeMaintenance)
        : next;
    }

    if (parsed.version === 3) {
      const coerced = coerceStorageValues(parsed as Partial<ShinromiiStorageV3>, fallback, {
        existingInstallation: true,
      });
      const next = replaceLegacyDummyGrades(coerced, fallback);
      const changedBeforeMaintenance = true;

      return options.persistMaintenanceMigrations
        ? persistStorageMaintenanceMigrations(next, changedBeforeMaintenance)
        : next;
    }

    if (parsed.version === 4) {
      const coerced = coerceStorageValues(parsed as Partial<ShinromiiStorageV4>, fallback, {
        existingInstallation: true,
      });
      const next = replaceLegacyDummyGrades(coerced, fallback);
      const changedBeforeMaintenance = true;

      return options.persistMaintenanceMigrations
        ? persistStorageMaintenanceMigrations(next, changedBeforeMaintenance)
        : next;
    }

    if (parsed.version === 5) {
      const changedBeforeMaintenance = true;
      const next = coerceStorageValues(parsed as Partial<ShinromiiStorageV5>, fallback, {
        existingInstallation: true,
      });

      return options.persistMaintenanceMigrations
        ? persistStorageMaintenanceMigrations(next, changedBeforeMaintenance)
        : next;
    }

    if (parsed.version === 6) {
      const changedBeforeMaintenance = true;
      const next = coerceStorageValues(parsed as Partial<ShinromiiStorageV6>, fallback, {
        existingInstallation: true,
      });

      return options.persistMaintenanceMigrations
        ? persistStorageMaintenanceMigrations(next, changedBeforeMaintenance)
        : next;
    }

    if (parsed.version === 7) {
      const changedBeforeMaintenance = true;
      const next = coerceStorageValues(parsed as Partial<ShinromiiStorageV7>, fallback, {
        existingInstallation: true,
      });

      return options.persistMaintenanceMigrations
        ? persistStorageMaintenanceMigrations(next, changedBeforeMaintenance)
        : next;
    }

    if (parsed.version === 8) {
      const changedBeforeMaintenance = true;
      const next = coerceStorageValues(parsed as Partial<ShinromiiStorageV8>, fallback, {
        existingInstallation: true,
      });

      return options.persistMaintenanceMigrations
        ? persistStorageMaintenanceMigrations(next, changedBeforeMaintenance)
        : next;
    }

    if (parsed.version !== STORAGE_VERSION) {
      return fallback;
    }

    const next = coerceStorageValues(parsed as Partial<ShinromiiStorage>, fallback);
    return options.persistMaintenanceMigrations ? persistStorageMaintenanceMigrations(next, false) : next;
  } catch {
    return fallback;
  }
}

export function readShinromiiStorageSnapshot(): ShinromiiStorage {
  return readShinromiiStorageInternal({
    persistMaintenanceMigrations: false,
  });
}

export function loadShinromiiStorage(): ShinromiiStorage {
  return readShinromiiStorageInternal({
    persistMaintenanceMigrations: true,
  });
}

export function saveShinromiiStorage(next: ShinromiiStorage) {
  if (!canUseStorage()) {
    return;
  }

  const payload = storageSnapshotPayload({
    ...next,
    ...(isDemoMode() ? { meta: { ...next.meta, isSample: true as const } } : {}),
    version: STORAGE_VERSION,
  });

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(STORAGE_KEY));

    if (raw) {
      const previous = parseBackupStorageData(JSON.parse(raw));

      if (previous && JSON.stringify(storageSnapshotPayload(previous)) !== JSON.stringify(payload)) {
        recordAutosaveSnapshot(storageSnapshotPayload(previous));
      }
    }
  } catch {
    // 履歴の失敗で本体保存は止めない
  }

  window.localStorage.setItem(scopedStorageKey(STORAGE_KEY), JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(STORAGE_UPDATED_EVENT));
}

export function hasExistingShinromiiInstallation() {
  return canUseStorage() && window.localStorage.getItem(scopedStorageKey(STORAGE_KEY)) !== null;
}

/** ストレージキーがある端末は既存ユーザー。新規でキーが無いときだけ初回セットアップを案内する。 */
export function shouldShowFirstSetup() {
  if (!canUseStorage()) return false;
  const raw = window.localStorage.getItem(scopedStorageKey(STORAGE_KEY));
  if (raw === null) return true;
  try {
    const data = JSON.parse(raw);
    return data.setupCompleted === false && !!normalizeSchoolSubjectsTemplate(data.schoolSubjects);
  } catch { return false; }
}

const RESUME_SETUP_KEY = "SHINROMII::resume-setup";

export function markResumeSetup() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return;
  }

  window.sessionStorage.setItem(scopedStorageKey(RESUME_SETUP_KEY), "1");
}

export function clearResumeSetup() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(scopedStorageKey(RESUME_SETUP_KEY));
}

export function shouldResumeSetup() {
  return (
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined" &&
    window.sessionStorage.getItem(scopedStorageKey(RESUME_SETUP_KEY)) === "1"
  );
}

export function saveUserProfile(profile: UserProfile, setupCompleted = true) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    profile: normalizeUserProfile(profile),
    identity: syncStudentProfileDisplayName(current.identity, normalizeUserProfile(profile)),
    setupCompleted,
  });
}

export function markSetupFinished(profile?: UserProfile) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    profile: normalizeUserProfile(profile ?? current.profile),
    identity: syncStudentProfileDisplayName(
      current.identity,
      normalizeUserProfile(profile ?? current.profile),
    ),
    setupCompleted: true,
  });
}

export function saveFirstSetupNotebook(storage: ShinromiiStorage) {
  const schoolSubjects = readSchoolSubjectSettings();
  saveShinromiiStorage({
    ...createBlankShinromiiStorage(),
    ...storage,
    ...(schoolSubjects ? { schoolSubjects } : {}),
    version: STORAGE_VERSION,
    profile: normalizeUserProfile(storage.profile),
    identity: normalizeIdentity(storage.identity, normalizeUserProfile(storage.profile)),
    setupCompleted: true,
  });
}

/** 再セットアップ完了。既存の相談・添付などを残し、セットアップで触った項目だけ更新する。 */
export function saveResumedSetupNotebook(storage: Pick<
  ShinromiiStorage,
  | "profile"
  | "gradeRecords"
  | "qualifications"
  | "universityCandidates"
  | "openCampusEvents"
  | "campusEvaluations"
  | "campusEvaluators"
>) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    profile: normalizeUserProfile(storage.profile),
    gradeRecords: storage.gradeRecords,
    qualifications: storage.qualifications,
    universityCandidates: storage.universityCandidates.map((record) => normalizeUniversityCandidate(record)),
    openCampusEvents: storage.openCampusEvents.map((event) => normalizeOpenCampusEvent(event)),
    campusEvaluators: normalizeCampusEvaluators(storage.campusEvaluators),
    campusEvaluations: normalizeCampusEvaluationsForStudent(
      storage.campusEvaluations,
      current.identity.session.currentStudentProfileId,
    ),
    identity: syncStudentProfileDisplayName(current.identity, normalizeUserProfile(storage.profile)),
    setupCompleted: true,
  });
}

export function saveAiNotes(nextAiNotes: AiNote[]) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    aiNotes: nextAiNotes.map((record) =>
      normalizeAiNoteMeta(record, current.identity.session.currentStudentProfileId),
    ),
  });
}

export function saveCampusEvaluation(campusId: string, evaluation: CampusEvaluation) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    campusEvaluations: {
      ...current.campusEvaluations,
      [campusId]: normalizeCampusEvaluationsForStudent(
        {
          [campusId]: normalizeCampusEvaluationEntries(campusId, evaluation),
        },
        current.identity.session.currentStudentProfileId,
      )[campusId],
    },
  });
}

export function saveCampusEvaluations(nextEvaluations: Record<string, CampusEvaluationEntry[]>) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    campusEvaluations: normalizeCampusEvaluationsForStudent(
      nextEvaluations,
      current.identity.session.currentStudentProfileId,
    ),
  });
}

export function saveCampusEvaluationState(
  nextEvaluations: Record<string, CampusEvaluationEntry[]>,
  nextEvaluators: CampusEvaluator[],
) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    campusEvaluators: normalizeCampusEvaluators(nextEvaluators),
    campusEvaluations: normalizeCampusEvaluationsForStudent(
      nextEvaluations,
      current.identity.session.currentStudentProfileId,
    ),
  });
}

export function saveUniversityCandidates(nextCandidates: UniversityCandidate[]) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    universityCandidates: nextCandidates.map((record) =>
      normalizeUniversityCandidateMeta(
        normalizeUniversityCandidate(record),
        current.identity.session.currentStudentProfileId,
      ),
    ),
  });
}

export function saveGradeRecords(nextGradeRecords: GradeRecord[]) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    gradeRecords: nextGradeRecords.map((record) =>
      normalizeGradeRecordMeta(record, current.identity.session.currentStudentProfileId),
    ),
  });
}

export function saveQualifications(nextQualifications: QualificationRecord[]) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    qualifications: nextQualifications.map((record) =>
      normalizeQualificationMeta(record, current.identity.session.currentStudentProfileId),
    ),
  });
}

export function saveOpenCampusEvents(nextOpenCampusEvents: OpenCampusEvent[]) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    openCampusEvents: nextOpenCampusEvents.map((event) =>
      normalizeOpenCampusEventMeta(
        normalizeOpenCampusEvent(event),
        current.identity.session.currentStudentProfileId,
      ),
    ),
  });
}

export function signInForLocalPreview(method: AuthMethod) {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    identity: signInIdentity(current.identity, { method }),
  });
}

export function signOutForLocalPreview() {
  const current = loadStorageForMutation();
  saveShinromiiStorage({
    ...current,
    identity: signOutIdentity(current.identity),
  });
}

export type AiNotesSortOrder = "newest" | "oldest" | "helpful";

export function loadAiNotesSortOrder(): AiNotesSortOrder {
  if (!canUseStorage()) {
    return "newest";
  }

  const stored = window.localStorage.getItem(scopedStorageKey(AI_NOTES_SORT_KEY));

  if (stored === "oldest" || stored === "helpful" || stored === "newest") {
    return stored;
  }

  return "newest";
}

export function saveAiNotesSortOrder(sortOrder: AiNotesSortOrder) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(scopedStorageKey(AI_NOTES_SORT_KEY), sortOrder);
}

export type UniversitySortOrder = "interest" | "newest" | "oldest" | "name";

export function loadUniversitySortOrder(): UniversitySortOrder {
  if (!canUseStorage()) {
    return "interest";
  }

  const stored = window.localStorage.getItem(scopedStorageKey(UNIVERSITY_SORT_KEY));

  if (stored === "newest" || stored === "oldest" || stored === "name" || stored === "interest") {
    return stored;
  }

  return "interest";
}

export function saveUniversitySortOrder(sortOrder: UniversitySortOrder) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(scopedStorageKey(UNIVERSITY_SORT_KEY), sortOrder);
}

/** Read subject metadata without maintenance migrations or fallback seed data. */
export function readSchoolSubjectSettings() {
  if (!canUseStorage()) return undefined;
  try {
    const raw = window.localStorage.getItem(scopedStorageKey(STORAGE_KEY));
    return raw ? normalizeSchoolSubjectsTemplate(JSON.parse(raw).schoolSubjects) : undefined;
  } catch { return undefined; }
}

export function inspectSchoolTemplateTarget() {
  if (isDemoMode()) throw new Error("デモモードでは適用できません。通常モードで開いてください。");
  if (!canUseStorage()) throw new Error("この端末では保存できません。");
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return { hasGrades: false, replacing: false };
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error("保存データを確認できないため、適用を中止しました。"); }
  if (!data || data.version !== STORAGE_VERSION || !parseBackupStorageData(data)) {
    throw new Error("保存データを確認できないため、適用を中止しました。");
  }
  return { hasGrades: data.gradeRecords.length > 0, replacing: !!data.schoolSubjects };
}

export function applySchoolSubjectsTemplate(key: string) {
  const template = getSchoolSubjectsTemplate(key);
  if (!template) throw new Error("科目テンプレートが見つかりません。");
  // Recheck at save time: a different tab may have saved grades after confirmation opened.
  const target = inspectSchoolTemplateTarget();
  if (target.hasGrades) throw new Error("成績が登録されています。成績への影響を避けるため、このバージョンでは適用できません。");
  const current = hasExistingShinromiiInstallation() ? readShinromiiStorageSnapshot() : createBlankShinromiiStorage();
  saveShinromiiStorage({ ...current, schoolSubjects: template });
}

/** 学校制度だけを保存し、成績レコードは変更しない。 */
export function saveGradePeriodSystem(system: GradePeriodSystem) {
  saveShinromiiStorage({ ...loadStorageForMutation(), gradePeriodSystem: normalizePeriodSystem(system) });
}
