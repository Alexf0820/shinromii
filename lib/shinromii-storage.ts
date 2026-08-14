import { aiNotes, campusDone, universities } from "@/data/mockData";
import type { AiNote, CampusEvaluation, UniversityCandidate } from "@/data/mockData";

const STORAGE_KEY = "SHINROMII::storage::v1";
const STORAGE_VERSION = 2;
const AI_NOTES_SORT_KEY = "SHINROMII::ai-notes-sort::v1";
const UNIVERSITY_SORT_KEY = "SHINROMII::university-sort::v1";

type ShinromiiStorage = {
  version: number;
  aiNotes: AiNote[];
  campusEvaluations: Record<string, CampusEvaluation>;
  universityCandidates: UniversityCandidate[];
};

type ShinromiiStorageV1 = {
  version: 1;
  aiNotes: AiNote[];
  campusEvaluations: Record<string, CampusEvaluation>;
};

function buildDefaultEvaluations() {
  return campusDone.reduce<Record<string, CampusEvaluation>>((acc, item) => {
    if (item.evaluation) {
      acc[item.id] = item.evaluation;
    }

    return acc;
  }, {});
}

function buildDefaultStorage(): ShinromiiStorage {
  return {
    version: STORAGE_VERSION,
    aiNotes,
    campusEvaluations: buildDefaultEvaluations(),
    universityCandidates: universities,
  };
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

    const parsed = JSON.parse(raw) as Partial<ShinromiiStorage | ShinromiiStorageV1>;

    if (parsed.version === 1) {
      const legacy = parsed as Partial<ShinromiiStorageV1>;

      return {
        version: STORAGE_VERSION,
        aiNotes: Array.isArray(legacy.aiNotes) ? legacy.aiNotes : fallback.aiNotes,
        campusEvaluations:
          legacy.campusEvaluations && typeof legacy.campusEvaluations === "object"
            ? legacy.campusEvaluations
            : fallback.campusEvaluations,
        universityCandidates: fallback.universityCandidates,
      };
    }

    if (parsed.version !== STORAGE_VERSION) {
      return fallback;
    }

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
    };
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
    }),
  );
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

export function saveUniversityCandidates(nextCandidates: UniversityCandidate[]) {
  const current = loadShinromiiStorage();
  saveShinromiiStorage({
    ...current,
    universityCandidates: nextCandidates,
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
