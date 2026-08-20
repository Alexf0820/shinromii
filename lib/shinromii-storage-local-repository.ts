import { loadAutosaveHistory } from "@/lib/shinromii-autosave";
import {
  hasExistingShinromiiInstallation,
  loadAiNotesSortOrder,
  loadShinromiiStorage,
  loadUniversitySortOrder,
  readShinromiiStorageSnapshot,
  saveAiNotesSortOrder,
  saveShinromiiStorage,
  saveUniversitySortOrder,
  shouldShowFirstSetup,
  type ShinromiiStorage,
} from "@/lib/shinromii-storage";
import type { ShinromiiStorageRepository } from "@/lib/shinromii-storage-repository";

const localShinromiiStorageRepository: ShinromiiStorageRepository = {
  kind: "local",
  async loadStorage(options) {
    return options?.mode === "readonly" ? readShinromiiStorageSnapshot() : loadShinromiiStorage();
  },
  async saveStorage(next: ShinromiiStorage) {
    saveShinromiiStorage(next);
  },
  async hasExistingInstallation() {
    return hasExistingShinromiiInstallation();
  },
  async shouldShowFirstSetup() {
    return shouldShowFirstSetup();
  },
  async loadAiNotesSortOrder() {
    return loadAiNotesSortOrder();
  },
  async saveAiNotesSortOrder(sortOrder) {
    saveAiNotesSortOrder(sortOrder);
  },
  async loadUniversitySortOrder() {
    return loadUniversitySortOrder();
  },
  async saveUniversitySortOrder(sortOrder) {
    saveUniversitySortOrder(sortOrder);
  },
  async loadAutosaveHistory() {
    return loadAutosaveHistory();
  },
};

export function getLocalShinromiiStorageRepository(): ShinromiiStorageRepository {
  return localShinromiiStorageRepository;
}
