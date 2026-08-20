import type { AutosaveHistoryEntry } from "@/lib/shinromii-autosave";
import type { AiNotesSortOrder, ShinromiiStorage, UniversitySortOrder } from "@/lib/shinromii-storage";

export type ShinromiiStorageLoadMode = "readonly" | "compatible";

/**
 * Async-first facade so Local / Cloud implementations can share a common surface.
 * `readonly` reads must not rely on migrations that write as a side effect.
 */
export interface ShinromiiStorageRepository {
  kind: "local" | "cloud";
  loadStorage(options?: { mode?: ShinromiiStorageLoadMode }): Promise<ShinromiiStorage>;
  saveStorage(next: ShinromiiStorage): Promise<void>;
  hasExistingInstallation(): Promise<boolean>;
  shouldShowFirstSetup(): Promise<boolean>;
  loadAiNotesSortOrder(): Promise<AiNotesSortOrder>;
  saveAiNotesSortOrder(sortOrder: AiNotesSortOrder): Promise<void>;
  loadUniversitySortOrder(): Promise<UniversitySortOrder>;
  saveUniversitySortOrder(sortOrder: UniversitySortOrder): Promise<void>;
  loadAutosaveHistory(): Promise<AutosaveHistoryEntry[]>;
}
