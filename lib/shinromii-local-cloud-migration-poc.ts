import { createShinromiiId } from "@/lib/shinromii-id";

export const SHINROMII_LOCAL_MIGRATION_POC_LOCAL_DB = "SHINROMII_LOCAL_MIGRATION_POC_LOCAL";
export const SHINROMII_LOCAL_MIGRATION_POC_CLOUD_DB = "SHINROMII_LOCAL_MIGRATION_POC_CLOUD";

const DB_VERSION = 1;
const LOCAL_PROFILE_STORE = "profiles";
const LOCAL_META_STORE = "meta";
const LOCAL_KEY_STORE = "keys";
const CLOUD_RECORD_STORE = "records";

const META_ID = "local-cloud-migration-meta";
const ACTOR_KEYPAIR_ID = "migration-actor-rsa-oaep-keypair";
const LOCAL_SCHEMA_VERSION = "local-cloud-poc-v1";
const MIGRATION_STALE_AFTER_MS = 60_000;
const IN_PROGRESS_MIGRATION_STATUSES: LocalCloudMigrationPocStatus[] = ["preparing", "encrypted", "uploaded", "verifying"];
const STEP_SEQUENCE: LocalCloudMigrationPocStep[] = [
  "localPrepared",
  "migrationIdGenerated",
  "dekGenerated",
  "encrypted",
  "wrapped",
  "uploaded",
  "fetched",
  "unwrapped",
  "decrypted",
  "matched",
  "verified",
];

export type LocalCloudMigrationPocStatus =
  | "idle"
  | "preparing"
  | "encrypted"
  | "uploaded"
  | "verifying"
  | "verified"
  | "failed";

export type LocalCloudMigrationPocStep =
  | "localPrepared"
  | "migrationIdGenerated"
  | "dekGenerated"
  | "encrypted"
  | "wrapped"
  | "uploaded"
  | "fetched"
  | "unwrapped"
  | "decrypted"
  | "matched"
  | "verified";

export type LocalCloudMigrationPocFailureMode =
  | "encrypt"
  | "cloudSave"
  | "cloudFetch"
  | "decrypt"
  | "mismatch";

export type LocalCloudMigrationPocFixture = {
  scope: "local-cloud-migration-poc";
  schemaVersion: string;
  profile: {
    id: string;
    displayName: string;
    createdAt: string;
  };
  gradeRecords: Array<{
    id: string;
    studentProfileId: string;
    schoolYear: "high-2";
    term: "first";
    subject: string;
    rating: number;
    createdAt: string;
  }>;
  qualifications: Array<{
    id: string;
    studentProfileId: string;
    name: string;
    level: string;
    status: "earned";
    examDate: string;
    createdAt: string;
  }>;
  universityCandidates: Array<{
    id: string;
    studentProfileId: string;
    university: string;
    faculty: string;
    interestLevel: "high";
    createdAt: string;
  }>;
  openCampusEvents: Array<{
    id: string;
    studentProfileId: string;
    university: string;
    eventName: string;
    status: "reserved";
    date: string;
    createdAt: string;
  }>;
  aiNotes: Array<{
    id: string;
    studentProfileId: string;
    title: string;
    summary: string;
    consultedAt: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type StoredMigrationMeta = {
  id: string;
  profileId: string | null;
  migrationId: string | null;
  claimFence: number;
  migrationStatus: LocalCloudMigrationPocStatus;
  completedSteps: LocalCloudMigrationPocStep[];
  failedStep: LocalCloudMigrationPocStep | null;
  updatedAt: string;
};

type StoredActorKeyPair = {
  id: string;
  algorithm: "RSA-OAEP";
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  createdAt: string;
};

type StoredCloudRecord = {
  profileId: string;
  migrationId: string;
  claimFence: number;
  migrationStatus: LocalCloudMigrationPocStatus;
  schemaVersion: string;
  cipherAlgorithm: "AES-GCM";
  wrapAlgorithm: "RSA-OAEP";
  iv: Uint8Array;
  cipherText: ArrayBuffer;
  wrappedDek: ArrayBuffer;
  createdAt: string;
  updatedAt: string;
};

type LocalCloudMigrationSnapshot = {
  hasLocalFixture: boolean;
  hasCloudRecord: boolean;
  profileId: string | null;
  migrationId: string | null;
  migrationStatus: LocalCloudMigrationPocStatus;
  staleRecovered: boolean;
  completedSteps: LocalCloudMigrationPocStep[];
  failedStep: LocalCloudMigrationPocStep | null;
  localUpdatedAt: string | null;
  cloudUpdatedAt: string | null;
};

export type LocalCloudMigrationPocResult = {
  fixture: LocalCloudMigrationPocFixture;
  payload: LocalCloudMigrationPocFixture;
  snapshot: LocalCloudMigrationSnapshot;
  completedSteps: LocalCloudMigrationPocStep[];
};

type LocalRepositoryState = {
  fixture: LocalCloudMigrationPocFixture | null;
  meta: StoredMigrationMeta | null;
  actorKeyPair: StoredActorKeyPair | null;
};

type ClaimedMigrationStart = {
  fixture: LocalCloudMigrationPocFixture;
  meta: StoredMigrationMeta;
};

type CloudRecordInput = Omit<StoredCloudRecord, "createdAt" | "updatedAt">;

export class LocalCloudMigrationPocFlowError extends Error {
  completedSteps: LocalCloudMigrationPocStep[];
  failedStep: LocalCloudMigrationPocStep | null;

  constructor(message: string, completedSteps: LocalCloudMigrationPocStep[], failedStep: LocalCloudMigrationPocStep | null) {
    super(message);
    this.name = "LocalCloudMigrationPocFlowError";
    this.completedSteps = completedSteps;
    this.failedStep = failedStep;
  }
}

class LocalCloudMigrationPocClaimError extends Error {
  code: "missing-fixture" | "active-migration";

  constructor(code: "missing-fixture" | "active-migration", message: string) {
    super(message);
    this.name = "LocalCloudMigrationPocClaimError";
    this.code = code;
  }
}

function canUseLocalCloudMigrationPoc() {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined"
  );
}

function createInitialMeta(profileId: string | null = null): StoredMigrationMeta {
  return {
    id: META_ID,
    profileId,
    migrationId: null,
    claimFence: 0,
    migrationStatus: "idle",
    completedSteps: profileId ? ["localPrepared"] : [],
    failedStep: null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeStoredMeta(meta: StoredMigrationMeta | undefined | null, profileId: string | null = null): StoredMigrationMeta | null {
  if (!meta) {
    return profileId ? createInitialMeta(profileId) : null;
  }

  return {
    ...meta,
    profileId: meta.profileId ?? profileId,
    claimFence: Number.isFinite(meta.claimFence) ? Math.max(0, meta.claimFence) : 0,
  };
}

function normalizeStoredCloudRecord(record: StoredCloudRecord | undefined | null): StoredCloudRecord | null {
  if (!record) return null;

  return {
    ...record,
    claimFence: Number.isFinite(record.claimFence) ? Math.max(0, record.claimFence) : 0,
  };
}

function createFixture(): LocalCloudMigrationPocFixture {
  const createdAt = new Date().toISOString();
  const profileId = createShinromiiId("student-profile");

  return {
    scope: "local-cloud-migration-poc",
    schemaVersion: LOCAL_SCHEMA_VERSION,
    profile: {
      id: profileId,
      displayName: "テスト生徒",
      createdAt,
    },
    gradeRecords: [
      {
        id: createShinromiiId("grade"),
        studentProfileId: profileId,
        schoolYear: "high-2",
        term: "first",
        subject: "英語",
        rating: 4,
        createdAt,
      },
    ],
    qualifications: [
      {
        id: createShinromiiId("qualification"),
        studentProfileId: profileId,
        name: "英検",
        level: "2級",
        status: "earned",
        examDate: "2026-07-12",
        createdAt,
      },
    ],
    universityCandidates: [
      {
        id: createShinromiiId("university-candidate"),
        studentProfileId: profileId,
        university: "テスト大学",
        faculty: "国際学部",
        interestLevel: "high",
        createdAt,
      },
    ],
    openCampusEvents: [
      {
        id: createShinromiiId("open-campus"),
        studentProfileId: profileId,
        university: "テスト大学",
        eventName: "オープンキャンパス",
        status: "reserved",
        date: "2026-08-24T13:00:00.000Z",
        createdAt,
      },
    ],
    aiNotes: [
      {
        id: createShinromiiId("ai-note"),
        studentProfileId: profileId,
        title: "将来の学び方を相談",
        summary: "家族共有移行PoC用の架空相談メモです。",
        consultedAt: "2026-08-18",
        createdAt,
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };
}

function serializeFixture(fixture: LocalCloudMigrationPocFixture) {
  return JSON.stringify(fixture);
}

function getRandomIv() {
  return window.crypto.getRandomValues(new Uint8Array(12));
}

function toCryptoIv(view: Uint8Array) {
  return Uint8Array.from(view);
}

async function generateDek() {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

async function generateWrapKeyPair() {
  const pair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    false,
    ["wrapKey", "unwrapKey"],
  );

  return pair as CryptoKeyPair;
}

async function openDatabase(
  name: string,
  onUpgrade: (database: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseLocalCloudMigrationPoc()) {
      reject(new Error("このブラウザではLocal→Cloud Migration PoCを実行できません。"));
      return;
    }

    let settled = false;
    const request = window.indexedDB.open(name, DB_VERSION);
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };

    request.onerror = () => {
      settle(() => {
        reject(new Error("Migration PoC用のIndexedDBを開けませんでした。"));
      });
    };

    request.onblocked = () => {
      settle(() => {
        reject(new Error("他のタブがMigration PoC用のIndexedDBを使用中です。他のタブを閉じてから再実行してください。"));
      });
    };

    request.onupgradeneeded = () => {
      onUpgrade(request.result);
    };

    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }

      settle(() => {
        resolve(request.result);
      });
    };
  });
}

async function withDatabase<T>(
  name: string,
  stores: string[],
  mode: IDBTransactionMode,
  onUpgrade: (database: IDBDatabase) => void,
  operation: (transaction: IDBTransaction) => T | Promise<T>,
): Promise<T> {
  const database = await openDatabase(name, onUpgrade);

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let transactionCompleted = false;
    let operationResult: T | undefined;
    let operationResolved = false;
    let operationRejected = false;
    let operationError: unknown;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      database.close();
      callback();
    };

    try {
      const transaction = database.transaction(stores, mode);

      const operationPromise = Promise.resolve(operation(transaction))
        .then((value) => {
          operationResult = value;
          operationResolved = true;

          if (transactionCompleted) {
            finish(() => {
              resolve(operationResult as T);
            });
          }
        })
        .catch((error) => {
          operationError = error;
          operationRejected = true;
          try {
            transaction.abort();
          } catch {}
          finish(() => {
            reject(
              operationError instanceof LocalCloudMigrationPocClaimError
                ? operationError
                : new Error("Migration PoCのIndexedDB処理に失敗しました。"),
            );
          });
        });

      transaction.oncomplete = () => {
        transactionCompleted = true;

        if (operationRejected) return;
        if (!operationResolved) {
          void operationPromise;
          return;
        }

        finish(() => {
          resolve(operationResult as T);
        });
      };

      transaction.onerror = () => {
        finish(() => {
          reject(new Error("Migration PoCのIndexedDBトランザクションに失敗しました。"));
        });
      };

      transaction.onabort = () => {
        finish(() => {
          reject(new Error("Migration PoCのIndexedDBトランザクションが中断されました。"));
        });
      };
    } catch {
      finish(() => {
        reject(new Error("Migration PoCのIndexedDB準備に失敗しました。"));
      });
    }
  });
}

function upgradeLocalDatabase(database: IDBDatabase) {
  if (!database.objectStoreNames.contains(LOCAL_PROFILE_STORE)) {
    database.createObjectStore(LOCAL_PROFILE_STORE, { keyPath: "profile.id" });
  }

  if (!database.objectStoreNames.contains(LOCAL_META_STORE)) {
    database.createObjectStore(LOCAL_META_STORE, { keyPath: "id" });
  }

  if (!database.objectStoreNames.contains(LOCAL_KEY_STORE)) {
    database.createObjectStore(LOCAL_KEY_STORE, { keyPath: "id" });
  }
}

function requestToPromise<T>(request: IDBRequest<T>, message: string) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(message));
    };
  });
}

function upgradeCloudDatabase(database: IDBDatabase) {
  if (!database.objectStoreNames.contains(CLOUD_RECORD_STORE)) {
    database.createObjectStore(CLOUD_RECORD_STORE, { keyPath: "profileId" });
  }
}

const localPocRepository = {
  async prepareFixture() {
    const fixture = createFixture();
    const meta = createInitialMeta(fixture.profile.id);

    await withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_LOCAL_DB,
      [LOCAL_PROFILE_STORE, LOCAL_META_STORE],
      "readwrite",
      upgradeLocalDatabase,
      (transaction) => {
        const profileStore = transaction.objectStore(LOCAL_PROFILE_STORE);
        profileStore.clear();
        profileStore.put(fixture);
        transaction.objectStore(LOCAL_META_STORE).put(meta);
      },
    );

    return { fixture, meta };
  },

  async loadState(): Promise<LocalRepositoryState> {
    return withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_LOCAL_DB,
      [LOCAL_PROFILE_STORE, LOCAL_META_STORE, LOCAL_KEY_STORE],
      "readonly",
      upgradeLocalDatabase,
      async (transaction) => {
        const profileStore = transaction.objectStore(LOCAL_PROFILE_STORE);
        const metaStore = transaction.objectStore(LOCAL_META_STORE);
        const keyStore = transaction.objectStore(LOCAL_KEY_STORE);
        const [fixtures, metaResult, keyResult] = await Promise.all([
          requestToPromise(profileStore.getAll() as IDBRequest<LocalCloudMigrationPocFixture[]>, "Migration PoC用Localデータの読み取りに失敗しました。"),
          requestToPromise(metaStore.get(META_ID) as IDBRequest<StoredMigrationMeta | undefined>, "Migration PoC用メタ情報の読み取りに失敗しました。"),
          requestToPromise(keyStore.get(ACTOR_KEYPAIR_ID) as IDBRequest<StoredActorKeyPair | undefined>, "Migration PoC用鍵の読み取りに失敗しました。"),
        ]);

        return {
          fixture: fixtures[0] ?? null,
          meta: normalizeStoredMeta(metaResult ?? null, fixtures[0]?.profile.id ?? null),
          actorKeyPair: keyResult ?? null,
        };
      },
    );
  },

  async saveMeta(meta: StoredMigrationMeta) {
    await withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_LOCAL_DB,
      [LOCAL_META_STORE],
      "readwrite",
      upgradeLocalDatabase,
      (transaction) => {
        transaction.objectStore(LOCAL_META_STORE).put(meta);
      },
    );
  },

  async saveMetaIfCurrentClaim(meta: StoredMigrationMeta) {
    await this.saveMetaIfCurrentClaimWithStatuses(meta, [meta.migrationStatus]);
  },

  async saveMetaIfCurrentClaimWithStatuses(meta: StoredMigrationMeta, expectedStatuses: LocalCloudMigrationPocStatus[]) {
    await withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_LOCAL_DB,
      [LOCAL_META_STORE],
      "readwrite",
      upgradeLocalDatabase,
      async (transaction) => {
        const store = transaction.objectStore(LOCAL_META_STORE);
        const existing = normalizeStoredMeta(
          (await requestToPromise(
            store.get(META_ID) as IDBRequest<StoredMigrationMeta | undefined>,
            "Migration PoC用メタ情報の読み取りに失敗しました。",
          )) ?? null,
        );

        if (
          !existing ||
          existing.profileId !== meta.profileId ||
          existing.claimFence !== meta.claimFence ||
          existing.migrationId !== meta.migrationId ||
          !expectedStatuses.includes(existing.migrationStatus)
        ) {
          throw new Error("現在のclaimと一致しない移行処理はメタ情報を書き換えできません。");
        }

        store.put(meta);
      },
    );
  },

  async claimMigrationStart() {
    return withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_LOCAL_DB,
      [LOCAL_PROFILE_STORE, LOCAL_META_STORE],
      "readwrite",
      upgradeLocalDatabase,
      async (transaction) => {
        const profileStore = transaction.objectStore(LOCAL_PROFILE_STORE);
        const metaStore = transaction.objectStore(LOCAL_META_STORE);
        const [fixtures, storedMeta] = await Promise.all([
          requestToPromise(profileStore.getAll() as IDBRequest<LocalCloudMigrationPocFixture[]>, "Migration PoC用Localデータの読み取りに失敗しました。"),
          requestToPromise(metaStore.get(META_ID) as IDBRequest<StoredMigrationMeta | undefined>, "Migration PoC用メタ情報の読み取りに失敗しました。"),
        ]);

        const fixture = fixtures[0] ?? null;
        if (!fixture) {
          throw new LocalCloudMigrationPocClaimError("missing-fixture", "先にPoC用のLocalデータを準備してください。");
        }

        const currentMeta = normalizeStoredMeta(storedMeta ?? null, fixture.profile.id) ?? createInitialMeta(fixture.profile.id);
        const activeMeta = isStaleInProgressMeta(currentMeta) ? createStaleFailedMeta(currentMeta) : currentMeta;

        if (activeMeta !== currentMeta) {
          metaStore.put(activeMeta);
        }

        if (IN_PROGRESS_MIGRATION_STATUSES.includes(activeMeta.migrationStatus)) {
          throw new LocalCloudMigrationPocClaimError(
            "active-migration",
            "別の移行処理がすでに進行中です。しばらくしてからもう一度お試しください。",
          );
        }

        const migrationId = createShinromiiId("migration");
        const claimedMeta: StoredMigrationMeta = {
          id: META_ID,
          profileId: fixture.profile.id,
          migrationId,
          claimFence: activeMeta.claimFence + 1,
          migrationStatus: "preparing",
          completedSteps: ["localPrepared", "migrationIdGenerated"],
          failedStep: null,
          updatedAt: new Date().toISOString(),
        };

        metaStore.put(claimedMeta);

        return {
          fixture,
          meta: claimedMeta,
        } satisfies ClaimedMigrationStart;
      },
    );
  },

  async ensureActorKeyPair() {
    const state = await this.loadState();

    if (state.actorKeyPair) {
      return state.actorKeyPair;
    }

    const pair = await generateWrapKeyPair();
    const stored: StoredActorKeyPair = {
      id: ACTOR_KEYPAIR_ID,
      algorithm: "RSA-OAEP",
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
      createdAt: new Date().toISOString(),
    };

    await withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_LOCAL_DB,
      [LOCAL_KEY_STORE],
      "readwrite",
      upgradeLocalDatabase,
      (transaction) => {
        transaction.objectStore(LOCAL_KEY_STORE).put(stored);
      },
    );

    return stored;
  },

  async clear() {
    await withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_LOCAL_DB,
      [LOCAL_PROFILE_STORE, LOCAL_META_STORE, LOCAL_KEY_STORE],
      "readwrite",
      upgradeLocalDatabase,
      (transaction) => {
        transaction.objectStore(LOCAL_PROFILE_STORE).clear();
        transaction.objectStore(LOCAL_META_STORE).clear();
        transaction.objectStore(LOCAL_KEY_STORE).clear();
      },
    );
  },
};

const cloudMockRepository = {
  async saveRecord(record: CloudRecordInput) {
    return withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_CLOUD_DB,
      [CLOUD_RECORD_STORE],
      "readwrite",
      upgradeCloudDatabase,
      async (transaction) => {
        const store = transaction.objectStore(CLOUD_RECORD_STORE);
        const existing = normalizeStoredCloudRecord(
          (await requestToPromise(
            store.get(record.profileId) as IDBRequest<StoredCloudRecord | undefined>,
            "Cloud Mockデータの読み取りに失敗しました。",
          )) ?? null,
        );

        if (existing) {
          if (record.claimFence < existing.claimFence) {
            throw new Error("新しいclaimより古い移行処理はCloud Mockを書き換えできません。");
          }

          if (record.claimFence === existing.claimFence && record.migrationId !== existing.migrationId) {
            throw new Error("現在のclaimと一致しない移行処理はCloud Mockを書き換えできません。");
          }
        }

        const now = new Date().toISOString();
        const nextRecord: StoredCloudRecord = {
          ...record,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };

        store.put(nextRecord);
        return nextRecord;
      },
    );
  },

  async loadRecord(profileId: string) {
    return withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_CLOUD_DB,
      [CLOUD_RECORD_STORE],
      "readonly",
      upgradeCloudDatabase,
      (transaction) =>
        new Promise<StoredCloudRecord | null>((resolve, reject) => {
          const request = transaction.objectStore(CLOUD_RECORD_STORE).get(profileId);

          request.onsuccess = () => {
            resolve(normalizeStoredCloudRecord((request.result as StoredCloudRecord | undefined) ?? null));
          };

          request.onerror = () => {
            reject(new Error("Cloud Mockデータの読み取りに失敗しました。"));
          };
        }),
    );
  },

  async clear() {
    await withDatabase(
      SHINROMII_LOCAL_MIGRATION_POC_CLOUD_DB,
      [CLOUD_RECORD_STORE],
      "readwrite",
      upgradeCloudDatabase,
      (transaction) => {
        transaction.objectStore(CLOUD_RECORD_STORE).clear();
      },
    );
  },
};

function ensureKnownSchemaVersion(schemaVersion: string) {
  if (schemaVersion !== LOCAL_SCHEMA_VERSION) {
    throw new Error(`未知のschemaVersionです: ${schemaVersion}`);
  }
}

function buildSnapshot(state: LocalRepositoryState, cloudRecord: StoredCloudRecord | null): LocalCloudMigrationSnapshot {
  const meta = state.meta ?? createInitialMeta(state.fixture?.profile.id ?? null);

  return {
    hasLocalFixture: state.fixture != null,
    hasCloudRecord: cloudRecord != null,
    profileId: state.fixture?.profile.id ?? meta.profileId,
    migrationId: meta.migrationId,
    migrationStatus: meta.migrationStatus,
    staleRecovered: false,
    completedSteps: meta.completedSteps,
    failedStep: meta.failedStep,
    localUpdatedAt: state.fixture?.updatedAt ?? null,
    cloudUpdatedAt: cloudRecord?.updatedAt ?? null,
  };
}

function inferPendingStep(completedSteps: LocalCloudMigrationPocStep[]) {
  return STEP_SEQUENCE.find((step) => !completedSteps.includes(step)) ?? completedSteps.at(-1) ?? "migrationIdGenerated";
}

function isStaleInProgressMeta(meta: StoredMigrationMeta) {
  if (!IN_PROGRESS_MIGRATION_STATUSES.includes(meta.migrationStatus)) {
    return false;
  }

  const updatedAt = Date.parse(meta.updatedAt);
  if (!Number.isFinite(updatedAt)) {
    return true;
  }

  return Date.now() - updatedAt >= MIGRATION_STALE_AFTER_MS;
}

function createStaleFailedMeta(meta: StoredMigrationMeta): StoredMigrationMeta {
  return {
    ...meta,
    migrationStatus: "failed",
    failedStep: meta.failedStep ?? inferPendingStep(meta.completedSteps),
    updatedAt: new Date().toISOString(),
  };
}

function reportMigrationPersistenceFailure(context: string, error: unknown) {
  console.error(`[LocalCloudMigrationPoC] ${context}`, error);
}

async function assertActiveClaim(
  profileId: string,
  migrationId: string,
  claimFence: number,
  expectedStatuses: LocalCloudMigrationPocStatus[],
) {
  const { state } = await reconcileLocalStateIfStale(await localPocRepository.loadState());
  const meta = state.meta;

  if (
    !meta ||
    meta.profileId !== profileId ||
    meta.migrationId !== migrationId ||
    meta.claimFence !== claimFence ||
    !expectedStatuses.includes(meta.migrationStatus)
  ) {
    throw new Error("現在のclaimと一致しないため、移行処理を継続できません。");
  }

  return meta;
}

async function reconcileLocalStateIfStale(state: LocalRepositoryState) {
  const meta = state.meta;

  if (!meta || !isStaleInProgressMeta(meta)) {
    return { state, staleRecovered: false };
  }

  const reconciledMeta = createStaleFailedMeta(meta);

  try {
    await localPocRepository.saveMetaIfCurrentClaimWithStatuses(reconciledMeta, IN_PROGRESS_MIGRATION_STATUSES);
  } catch (error) {
    reportMigrationPersistenceFailure("Failed to persist stale migration recovery state.", error);

    const currentState = await localPocRepository.loadState();
    return { state: currentState, staleRecovered: false };
  }

  return {
    state: {
      ...state,
      meta: reconciledMeta,
    },
    staleRecovered: true,
  };
}

async function persistMetaProgress(
  fixture: LocalCloudMigrationPocFixture,
  migrationId: string,
  claimFence: number,
  migrationStatus: LocalCloudMigrationPocStatus,
  expectedStatuses: LocalCloudMigrationPocStatus[],
  completedSteps: LocalCloudMigrationPocStep[],
  failedStep: LocalCloudMigrationPocStep | null = null,
) {
  await localPocRepository.saveMetaIfCurrentClaimWithStatuses(
    {
      id: META_ID,
      profileId: fixture.profile.id,
      migrationId,
      claimFence,
      migrationStatus,
      completedSteps,
      failedStep,
      updatedAt: new Date().toISOString(),
    },
    expectedStatuses,
  );
}

function createFlowError(
  message: string,
  completedSteps: LocalCloudMigrationPocStep[],
  failedStep: LocalCloudMigrationPocStep | null,
) {
  return new LocalCloudMigrationPocFlowError(message, completedSteps, failedStep);
}

function rethrowAsFlowError(
  error: unknown,
  message: string,
  completedSteps: LocalCloudMigrationPocStep[],
  failedStep: LocalCloudMigrationPocStep,
): never {
  if (error instanceof LocalCloudMigrationPocFlowError) {
    throw error;
  }

  throw createFlowError(message, completedSteps, failedStep);
}

function maybeSimulateFailure(mode: LocalCloudMigrationPocFailureMode | undefined, expected: LocalCloudMigrationPocFailureMode) {
  if (mode === expected) {
    throw new Error("PoC異常系テスト用に失敗を発生させました。");
  }
}

// TODO(v0.95): 実移行では BroadcastChannel / Web Locks API で、meta状態確認と書き込みの競合を含むマルチタブ同時実行を防ぐ。
export async function prepareLocalCloudMigrationPocFixture() {
  const result = await localPocRepository.prepareFixture();
  const cloudRecord = await cloudMockRepository.loadRecord(result.fixture.profile.id);

  return {
    fixture: result.fixture,
    snapshot: buildSnapshot(
      {
        fixture: result.fixture,
        meta: result.meta,
        actorKeyPair: null,
      },
      cloudRecord,
    ),
  };
}

export async function loadLocalCloudMigrationPocSnapshot() {
  const loadedState = await localPocRepository.loadState();
  const { state, staleRecovered } = await reconcileLocalStateIfStale(loadedState);
  const profileId = state.fixture?.profile.id ?? state.meta?.profileId ?? null;
  const cloudRecord = profileId ? await cloudMockRepository.loadRecord(profileId) : null;
  return {
    ...buildSnapshot(state, cloudRecord),
    staleRecovered,
  };
}

export async function runLocalCloudMigrationPoc(
  options: { simulateFailure?: LocalCloudMigrationPocFailureMode } = {},
): Promise<LocalCloudMigrationPocResult> {
  const { simulateFailure } = options;
  let claim: ClaimedMigrationStart;
  try {
    claim = await localPocRepository.claimMigrationStart();
  } catch (error) {
    if (error instanceof LocalCloudMigrationPocClaimError) {
      if (error.code === "missing-fixture") {
        throw createFlowError(error.message, [], "localPrepared");
      }

      throw createFlowError(error.message, ["localPrepared"], "migrationIdGenerated");
    }

    throw createFlowError("移行開始の準備に失敗しました。", [], "migrationIdGenerated");
  }

  const fixture = claim.fixture;
  const completedSteps: LocalCloudMigrationPocStep[] = ["localPrepared"];
  const migrationId = claim.meta.migrationId;
  const claimFence = claim.meta.claimFence;
  let currentStep: LocalCloudMigrationPocStep = "dekGenerated";
  completedSteps.push("migrationIdGenerated");

  try {
    if (!migrationId) {
      throw createFlowError("移行開始情報の初期化に失敗しました。", completedSteps, "migrationIdGenerated");
    }

    try {
      ensureKnownSchemaVersion(fixture.schemaVersion);
    } catch (error) {
      rethrowAsFlowError(error, "LocalデータのschemaVersionを検証できませんでした。", completedSteps, currentStep);
    }

    currentStep = "dekGenerated";
    let dek: CryptoKey;
    try {
      dek = await generateDek();
    } catch (error) {
      rethrowAsFlowError(error, "Student Profile用DEKの生成に失敗しました。", completedSteps, "dekGenerated");
    }
    completedSteps.push("dekGenerated");
    await persistMetaProgress(fixture, migrationId, claimFence, "preparing", ["preparing"], completedSteps);

    const serializedFixture = serializeFixture(fixture);
    const iv = getRandomIv();
    currentStep = "encrypted";
    try {
      maybeSimulateFailure(simulateFailure, "encrypt");
    } catch (error) {
      rethrowAsFlowError(error, "Localデータの暗号化に失敗しました。", completedSteps, currentStep);
    }
    let cipherText: ArrayBuffer;
    try {
      cipherText = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: toCryptoIv(iv),
        },
        dek,
        new TextEncoder().encode(serializedFixture),
      );
    } catch (error) {
      rethrowAsFlowError(error, "Localデータの暗号化に失敗しました。", completedSteps, "encrypted");
    }
    completedSteps.push("encrypted");

    currentStep = "wrapped";
    let actorKeyPair: StoredActorKeyPair;
    let wrappedDek: ArrayBuffer;
    try {
      actorKeyPair = await localPocRepository.ensureActorKeyPair();
      wrappedDek = await window.crypto.subtle.wrapKey("raw", dek, actorKeyPair.publicKey, { name: "RSA-OAEP" });
    } catch (error) {
      rethrowAsFlowError(error, "wrapped DEKの生成に失敗しました。", completedSteps, "wrapped");
    }
    completedSteps.push("wrapped");
    await persistMetaProgress(fixture, migrationId, claimFence, "encrypted", ["preparing"], completedSteps);

    currentStep = "uploaded";
    try {
      maybeSimulateFailure(simulateFailure, "cloudSave");
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockへの保存に失敗しました。", completedSteps, currentStep);
    }
    try {
      await assertActiveClaim(fixture.profile.id, migrationId, claimFence, ["encrypted"]);
      await cloudMockRepository.saveRecord({
        profileId: fixture.profile.id,
        migrationId,
        claimFence,
        migrationStatus: "uploaded",
        schemaVersion: fixture.schemaVersion,
        cipherAlgorithm: "AES-GCM",
        wrapAlgorithm: "RSA-OAEP",
        iv,
        cipherText,
        wrappedDek,
      });
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockへの保存に失敗しました。", completedSteps, "uploaded");
    }
    completedSteps.push("uploaded");
    await persistMetaProgress(fixture, migrationId, claimFence, "uploaded", ["encrypted"], completedSteps);

    currentStep = "fetched";
    try {
      maybeSimulateFailure(simulateFailure, "cloudFetch");
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockから移行データを再取得できませんでした。", completedSteps, currentStep);
    }
    let cloudRecord: StoredCloudRecord | null;
    try {
      cloudRecord = await cloudMockRepository.loadRecord(fixture.profile.id);
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockから移行データを再取得できませんでした。", completedSteps, "fetched");
    }

    if (!cloudRecord || cloudRecord.migrationId !== migrationId || cloudRecord.claimFence !== claimFence) {
      throw createFlowError("Cloud Mockから移行データを再取得できませんでした。", completedSteps, "fetched");
    }

    try {
      ensureKnownSchemaVersion(cloudRecord.schemaVersion);
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockから取得したschemaVersionを検証できませんでした。", completedSteps, currentStep);
    }
    completedSteps.push("fetched");
    await persistMetaProgress(fixture, migrationId, claimFence, "verifying", ["uploaded"], completedSteps);

    currentStep = "unwrapped";
    let restoredDek: CryptoKey;
    try {
      restoredDek = await window.crypto.subtle.unwrapKey(
        "raw",
        cloudRecord.wrappedDek,
        actorKeyPair.privateKey,
        { name: "RSA-OAEP" },
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["decrypt"],
      );
    } catch (error) {
      rethrowAsFlowError(error, "wrapped DEKからのDEK復元に失敗しました。", completedSteps, "unwrapped");
    }
    completedSteps.push("unwrapped");

    currentStep = "decrypted";
    try {
      maybeSimulateFailure(simulateFailure, "decrypt");
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockから再取得したpayloadの復号に失敗しました。", completedSteps, currentStep);
    }
    let decrypted: ArrayBuffer;
    try {
      decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: toCryptoIv(cloudRecord.iv),
        },
        restoredDek,
        cloudRecord.cipherText,
      );
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockから再取得したpayloadの復号に失敗しました。", completedSteps, "decrypted");
    }
    completedSteps.push("decrypted");

    currentStep = "matched";
    const decoded = new TextDecoder().decode(decrypted);
    if (simulateFailure === "mismatch") {
      throw createFlowError("復号後のデータがLocal元データと一致しませんでした。", completedSteps, currentStep);
    }

    if (decoded !== serializedFixture) {
      throw createFlowError("復号後のデータがLocal元データと一致しませんでした。", completedSteps, currentStep);
    }

    const payload = JSON.parse(decoded) as LocalCloudMigrationPocFixture;
    try {
      ensureKnownSchemaVersion(payload.schemaVersion);
    } catch (error) {
      rethrowAsFlowError(error, "復号後データのschemaVersionを検証できませんでした。", completedSteps, currentStep);
    }
    completedSteps.push("matched");

    currentStep = "verified";
    try {
      await assertActiveClaim(fixture.profile.id, migrationId, claimFence, ["verifying"]);
      await cloudMockRepository.saveRecord({
        ...cloudRecord,
        claimFence,
        migrationStatus: "verified",
      });
    } catch (error) {
      rethrowAsFlowError(error, "verified状態の確定保存に失敗しました。", completedSteps, "verified");
    }
    completedSteps.push("verified");
    await persistMetaProgress(fixture, migrationId, claimFence, "verified", ["verifying"], completedSteps);

    const snapshot = await loadLocalCloudMigrationPocSnapshot();

    return {
      fixture,
      payload,
      snapshot,
      completedSteps,
    };
  } catch (error) {
    const flowError =
      error instanceof LocalCloudMigrationPocFlowError
        ? error
        : createFlowError(
            error instanceof Error ? error.message : "Local→Cloud Migration PoCに失敗しました。",
            completedSteps,
            currentStep,
          );

    try {
      await persistMetaProgress(
        fixture,
        migrationId ?? claim.meta.migrationId ?? "unknown-migration",
        claimFence,
        "failed",
        ["preparing", "encrypted", "uploaded", "verifying"],
        flowError.completedSteps,
        flowError.failedStep,
      );
    } catch (persistenceError) {
      reportMigrationPersistenceFailure("Failed to persist migration failure state.", persistenceError);
    }
    throw flowError;
  }
}

export async function verifyStoredLocalCloudMigrationPoc(): Promise<LocalCloudMigrationPocResult> {
  const { state } = await reconcileLocalStateIfStale(await localPocRepository.loadState());
  const fixture = state.fixture;

  if (!fixture) {
    throw createFlowError("PoC用のLocalデータが見つかりません。", [], "localPrepared");
  }

  const meta = state.meta ?? createInitialMeta(fixture.profile.id);
  const migrationId = meta.migrationId;
  const claimFence = meta.claimFence;

  const completedSteps = [...meta.completedSteps];
  let currentStep: LocalCloudMigrationPocStep = completedSteps.includes("fetched") ? "unwrapped" : "fetched";

  try {
    try {
      ensureKnownSchemaVersion(fixture.schemaVersion);
    } catch (error) {
      rethrowAsFlowError(error, "LocalデータのschemaVersionを検証できませんでした。", completedSteps, currentStep);
    }

    if (!migrationId) {
      throw createFlowError("保存済みのmigrationIdが見つかりません。", completedSteps, "migrationIdGenerated");
    }

    currentStep = "fetched";
    let cloudRecord: StoredCloudRecord | null;
    try {
      cloudRecord = await cloudMockRepository.loadRecord(fixture.profile.id);
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockから移行データを再取得できませんでした。", completedSteps, "fetched");
    }
    if (!cloudRecord || cloudRecord.migrationId !== migrationId || cloudRecord.claimFence !== claimFence) {
      throw createFlowError("Cloud Mockから移行データを再取得できませんでした。", completedSteps, "fetched");
    }
    try {
      ensureKnownSchemaVersion(cloudRecord.schemaVersion);
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockから取得したschemaVersionを検証できませんでした。", completedSteps, currentStep);
    }
    if (!completedSteps.includes("fetched")) completedSteps.push("fetched");

    currentStep = "unwrapped";
    let restoredDek: CryptoKey;
    try {
      const actorKeyPair = await localPocRepository.ensureActorKeyPair();
      restoredDek = await window.crypto.subtle.unwrapKey(
        "raw",
        cloudRecord.wrappedDek,
        actorKeyPair.privateKey,
        { name: "RSA-OAEP" },
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["decrypt"],
      );
    } catch (error) {
      rethrowAsFlowError(error, "wrapped DEKからのDEK復元に失敗しました。", completedSteps, "unwrapped");
    }
    if (!completedSteps.includes("unwrapped")) completedSteps.push("unwrapped");

    currentStep = "decrypted";
    let decrypted: ArrayBuffer;
    try {
      decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: toCryptoIv(cloudRecord.iv),
        },
        restoredDek,
        cloudRecord.cipherText,
      );
    } catch (error) {
      rethrowAsFlowError(error, "Cloud Mockから再取得したpayloadの復号に失敗しました。", completedSteps, "decrypted");
    }
    if (!completedSteps.includes("decrypted")) completedSteps.push("decrypted");

    currentStep = "matched";
    const decoded = new TextDecoder().decode(decrypted);
    if (decoded !== serializeFixture(fixture)) {
      throw createFlowError("復号後のデータがLocal元データと一致しませんでした。", completedSteps, "matched");
    }

    const payload = JSON.parse(decoded) as LocalCloudMigrationPocFixture;
    try {
      ensureKnownSchemaVersion(payload.schemaVersion);
    } catch (error) {
      rethrowAsFlowError(error, "復号後データのschemaVersionを検証できませんでした。", completedSteps, currentStep);
    }
    if (!completedSteps.includes("matched")) completedSteps.push("matched");

    currentStep = "verified";
    try {
      await assertActiveClaim(fixture.profile.id, migrationId, claimFence, ["uploaded", "verifying", "verified"]);
      await cloudMockRepository.saveRecord({
        ...cloudRecord,
        claimFence,
        migrationStatus: "verified",
      });
    } catch (error) {
      rethrowAsFlowError(error, "verified状態の確定保存に失敗しました。", completedSteps, "verified");
    }
    if (!completedSteps.includes("verified")) completedSteps.push("verified");
    await persistMetaProgress(fixture, migrationId, claimFence, "verified", ["uploaded", "verifying", "verified"], completedSteps);

    const snapshot = await loadLocalCloudMigrationPocSnapshot();

    return {
      fixture,
      payload,
      snapshot,
      completedSteps,
    };
  } catch (error) {
    const flowError =
      error instanceof LocalCloudMigrationPocFlowError
        ? error
        : createFlowError(
            error instanceof Error ? error.message : "保存済みMigration PoCの再検証に失敗しました。",
            completedSteps,
            currentStep,
          );
    try {
      await persistMetaProgress(
        fixture,
        migrationId ?? "unknown-migration",
        claimFence,
        "failed",
        ["uploaded", "verifying", "verified"],
        flowError.completedSteps,
        flowError.failedStep,
      );
    } catch (persistenceError) {
      reportMigrationPersistenceFailure("Failed to persist migration verification failure state.", persistenceError);
    }
    throw flowError;
  }
}

export async function clearLocalCloudMigrationPocData() {
  await Promise.all([localPocRepository.clear(), cloudMockRepository.clear()]);
}
