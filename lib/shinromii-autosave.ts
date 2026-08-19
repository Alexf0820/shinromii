export const AUTOSAVE_HISTORY_KEY = "SHINROMII::autosave-history::v1";
export const AUTOSAVE_HISTORY_LIMIT = 3;

export type AutosaveHistoryEntry = {
  id: string;
  savedAt: string;
  data: unknown;
};

type AutosaveHistoryFile = {
  version: 1;
  entries: AutosaveHistoryEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function snapshotSignature(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function createAutosaveId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `autosave-${Date.now()}`;
}

export function formatAutosaveDateTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

export function parseAutosaveHistory(value: unknown): AutosaveHistoryEntry[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.entries)
      ? value.entries
      : [];

  const entries: AutosaveHistoryEntry[] = [];

  for (const row of rows) {
    if (!isRecord(row) || typeof row.id !== "string" || typeof row.savedAt !== "string") {
      continue;
    }

    if (!("data" in row)) {
      continue;
    }

    entries.push({
      id: row.id,
      savedAt: row.savedAt,
      data: row.data,
    });

    if (entries.length >= AUTOSAVE_HISTORY_LIMIT) {
      break;
    }
  }

  return entries;
}

/** 新しい履歴を先頭へ入れ、同じ内容の重複を除いて3件に保つ。 */
export function pushAutosaveEntry(
  entries: AutosaveHistoryEntry[],
  next: AutosaveHistoryEntry,
): AutosaveHistoryEntry[] {
  const nextSignature = snapshotSignature(next.data);

  if (!nextSignature) {
    return entries.slice(0, AUTOSAVE_HISTORY_LIMIT);
  }

  if (entries[0] && snapshotSignature(entries[0].data) === nextSignature) {
    return entries.slice(0, AUTOSAVE_HISTORY_LIMIT);
  }

  const withoutSame = entries.filter((entry) => snapshotSignature(entry.data) !== nextSignature);

  return [next, ...withoutSame].slice(0, AUTOSAVE_HISTORY_LIMIT);
}

export function loadAutosaveHistory(): AutosaveHistoryEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(AUTOSAVE_HISTORY_KEY);

    if (!raw) {
      return [];
    }

    return parseAutosaveHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

function persistAutosaveHistory(entries: AutosaveHistoryEntry[]) {
  if (!canUseStorage()) {
    return;
  }

  const file: AutosaveHistoryFile = {
    version: 1,
    entries: entries.slice(0, AUTOSAVE_HISTORY_LIMIT),
  };

  window.localStorage.setItem(AUTOSAVE_HISTORY_KEY, JSON.stringify(file));
}

export function recordAutosaveSnapshot(data: unknown, savedAt = new Date().toISOString()) {
  if (!isRecord(data)) {
    return;
  }

  const next = pushAutosaveEntry(loadAutosaveHistory(), {
    id: createAutosaveId(),
    savedAt,
    data,
  });

  persistAutosaveHistory(next);
}
