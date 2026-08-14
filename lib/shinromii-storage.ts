import { aiNotes, campusDone } from "@/data/mockData";
import type { AiNote, CampusEvaluation } from "@/data/mockData";

const STORAGE_KEY = "SHINROMII::storage::v1";
const STORAGE_VERSION = 1;

type ShinromiiStorage = {
  version: number;
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

    const parsed = JSON.parse(raw) as Partial<ShinromiiStorage>;

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
