import type { ShinromiiStorage } from "@/lib/shinromii-storage";
import { parseBackupStorageData, STORAGE_VERSION } from "@/lib/shinromii-storage";

export const SHINROMII_BACKUP_APP = "SHINROMII";
export const SHINROMII_BACKUP_VERSION = 1;

export type ShinromiiBackupFile = {
  app: typeof SHINROMII_BACKUP_APP;
  backupVersion: typeof SHINROMII_BACKUP_VERSION;
  createdAt: string;
  storageVersion: number;
  data: ShinromiiStorage;
};

type ParseBackupResult =
  | {
      ok: true;
      backup: ShinromiiBackupFile;
      storage: ShinromiiStorage;
    }
  | {
      ok: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatBackupFileName(date = new Date()) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `shinromii-backup-${year}-${month}-${day}-${hours}${minutes}${seconds}.json`;
}

export function buildShinromiiBackup(
  storage: ShinromiiStorage,
  createdAt = new Date().toISOString(),
): ShinromiiBackupFile {
  return {
    app: SHINROMII_BACKUP_APP,
    backupVersion: SHINROMII_BACKUP_VERSION,
    createdAt,
    storageVersion: STORAGE_VERSION,
    data: {
      version: storage.version,
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
    },
  };
}

export function stringifyShinromiiBackup(storage: ShinromiiStorage) {
  return JSON.stringify(buildShinromiiBackup(storage), null, 2);
}

export function parseShinromiiBackupJson(raw: string): ParseBackupResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error:
        "バックアップファイルを読み込めませんでした。SHINROMiiで作成したバックアップファイルか確認してください。",
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: "このファイルはSHINROMiiのバックアップとして読み込めませんでした。",
    };
  }

  if (parsed.app !== SHINROMII_BACKUP_APP) {
    return {
      ok: false,
      error: "このファイルはSHINROMiiのバックアップではありません。",
    };
  }

  if (parsed.backupVersion !== SHINROMII_BACKUP_VERSION) {
    return {
      ok: false,
      error: "このバックアップには対応していません。SHINROMiiで保存したバックアップファイルか確認してください。",
    };
  }

  if (typeof parsed.createdAt !== "string" || typeof parsed.storageVersion !== "number") {
    return {
      ok: false,
      error: "バックアップファイルの内容が足りないため、復元できませんでした。",
    };
  }

  const storage = parseBackupStorageData(parsed.data);

  if (!storage) {
    return {
      ok: false,
      error: "バックアップファイルの内容を読み込めませんでした。",
    };
  }

  return {
    ok: true,
    backup: {
      app: SHINROMII_BACKUP_APP,
      backupVersion: SHINROMII_BACKUP_VERSION,
      createdAt: parsed.createdAt,
      storageVersion: parsed.storageVersion,
      data: storage,
    },
    storage,
  };
}
