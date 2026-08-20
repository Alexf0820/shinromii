export const SHINROMII_FAMILY_KEY_SHARING_POC_DB = "SHINROMII_FAMILY_KEY_SHARING_POC";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const RECORD_STORE = "records";

const FAMILY_POC_SAMPLE_VERSION = "family-poc-v1";
const PARENT_KEYPAIR_ID = "parent-rsa-oaep-keypair";
const CHILD_KEYPAIR_ID = "child-rsa-oaep-keypair";
const RECORD_ID = "student-profile-shared-record";

export type FamilyKeySharingPocRole = "parent" | "child";

export type FamilyKeySharingPocStep =
  | "dekGenerated"
  | "encrypted"
  | "parentKeyPairGenerated"
  | "childKeyPairGenerated"
  | "parentWrapped"
  | "childWrapped"
  | "saved"
  | "parentKeyLoaded"
  | "parentUnwrapped"
  | "parentDecrypted"
  | "parentMatched"
  | "childKeyLoaded"
  | "childUnwrapped"
  | "childDecrypted"
  | "childMatched"
  | "parentWrappedRejectedByChild"
  | "childWrappedRejectedByParent";

export type FamilyKeySharingPocSample = {
  scope: "family-key-sharing-poc";
  version: string;
  studentProfile: {
    displayName: string;
    track: string;
  };
  records: {
    qualification: string;
    universityCandidate: string;
    memo: string;
  };
};

type StoredKeyPairRecord = {
  id: string;
  owner: FamilyKeySharingPocRole;
  algorithm: "RSA-OAEP";
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  createdAt: string;
};

type StoredFamilyRecord = {
  id: string;
  scope: "family-key-sharing-poc";
  sampleVersion: string;
  cipherAlgorithm: "AES-GCM";
  wrapAlgorithm: "RSA-OAEP";
  iv: Uint8Array;
  cipherText: ArrayBuffer;
  parentWrappedDek: ArrayBuffer;
  childWrappedDek: ArrayBuffer;
  createdAt: string;
};

type StoredFamilyBundle = {
  parentKeyRecord: StoredKeyPairRecord | null;
  childKeyRecord: StoredKeyPairRecord | null;
  familyRecord: StoredFamilyRecord | null;
};

type FamilyKeySharingPocSnapshot = {
  hasParentKeyPair: boolean;
  hasChildKeyPair: boolean;
  hasFamilyRecord: boolean;
  storedCreatedAt: string | null;
};

export class FamilyKeySharingPocFlowError extends Error {
  completedSteps: FamilyKeySharingPocStep[];
  failedStep: FamilyKeySharingPocStep | null;

  constructor(message: string, completedSteps: FamilyKeySharingPocStep[], failedStep: FamilyKeySharingPocStep | null) {
    super(message);
    this.name = "FamilyKeySharingPocFlowError";
    this.completedSteps = completedSteps;
    this.failedStep = failedStep;
  }
}

function canUseFamilyKeySharingPoc() {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined"
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseFamilyKeySharingPoc()) {
      reject(new Error("このブラウザでは家族共有暗号化PoCを実行できません。"));
      return;
    }

    let settled = false;
    const request = window.indexedDB.open(SHINROMII_FAMILY_KEY_SHARING_POC_DB, DB_VERSION);
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };

    request.onerror = () => {
      settle(() => {
        reject(new Error("家族共有暗号化PoC用のIndexedDBを開けませんでした。"));
      });
    };

    request.onblocked = () => {
      settle(() => {
        reject(new Error("他のタブが家族共有暗号化PoC用のIndexedDBを使用中です。他のタブを閉じてから再実行してください。"));
      });
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(KEY_STORE)) {
        database.createObjectStore(KEY_STORE, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(RECORD_STORE)) {
        database.createObjectStore(RECORD_STORE, { keyPath: "id" });
      }
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

function createSamplePayload(): FamilyKeySharingPocSample {
  return {
    scope: "family-key-sharing-poc",
    version: FAMILY_POC_SAMPLE_VERSION,
    studentProfile: {
      displayName: "テスト生徒",
      track: "家族共有暗号化PoC",
    },
    records: {
      qualification: "英検2級",
      universityCandidate: "テスト大学",
      memo: "家族共有暗号化PoC",
    },
  };
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

async function loadStoredFamilyBundle(): Promise<StoredFamilyBundle> {
  return openDatabase().then(
    (database) =>
      new Promise<StoredFamilyBundle>((resolve, reject) => {
        let settled = false;
        let parentKeyRecord: StoredKeyPairRecord | null = null;
        let childKeyRecord: StoredKeyPairRecord | null = null;
        let familyRecord: StoredFamilyRecord | null = null;
        const transaction = database.transaction([KEY_STORE, RECORD_STORE], "readonly");
        const parentRequest = transaction.objectStore(KEY_STORE).get(PARENT_KEYPAIR_ID);
        const childRequest = transaction.objectStore(KEY_STORE).get(CHILD_KEYPAIR_ID);
        const recordRequest = transaction.objectStore(RECORD_STORE).get(RECORD_ID);
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          database.close();
          callback();
        };

        parentRequest.onsuccess = () => {
          parentKeyRecord = (parentRequest.result as StoredKeyPairRecord | undefined) ?? null;
        };

        childRequest.onsuccess = () => {
          childKeyRecord = (childRequest.result as StoredKeyPairRecord | undefined) ?? null;
        };

        recordRequest.onsuccess = () => {
          familyRecord = (recordRequest.result as StoredFamilyRecord | undefined) ?? null;
        };

        parentRequest.onerror = childRequest.onerror = recordRequest.onerror = () => {
          finish(() => {
            reject(new Error("家族共有暗号化PoCのIndexedDB読み取りに失敗しました。"));
          });
        };

        transaction.oncomplete = () => {
          finish(() => {
            resolve({ parentKeyRecord, childKeyRecord, familyRecord });
          });
        };

        transaction.onerror = () => {
          finish(() => {
            reject(new Error("家族共有暗号化PoCのIndexedDB読み取りトランザクションに失敗しました。"));
          });
        };

        transaction.onabort = () => {
          finish(() => {
            reject(new Error("家族共有暗号化PoCのIndexedDB読み取りトランザクションが中断されました。"));
          });
        };
      }),
  );
}

async function saveStoredFamilyBundle(parentKeyPair: CryptoKeyPair, childKeyPair: CryptoKeyPair, record: StoredFamilyRecord) {
  const createdAt = new Date().toISOString();

  await openDatabase().then(
    (database) =>
      new Promise<void>((resolve, reject) => {
        let settled = false;
        const transaction = database.transaction([KEY_STORE, RECORD_STORE], "readwrite");
        const keyStore = transaction.objectStore(KEY_STORE);
        const recordStore = transaction.objectStore(RECORD_STORE);
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          database.close();
          callback();
        };

        keyStore.put({
          id: PARENT_KEYPAIR_ID,
          owner: "parent",
          algorithm: "RSA-OAEP",
          publicKey: parentKeyPair.publicKey,
          privateKey: parentKeyPair.privateKey,
          createdAt,
        } satisfies StoredKeyPairRecord);

        keyStore.put({
          id: CHILD_KEYPAIR_ID,
          owner: "child",
          algorithm: "RSA-OAEP",
          publicKey: childKeyPair.publicKey,
          privateKey: childKeyPair.privateKey,
          createdAt,
        } satisfies StoredKeyPairRecord);

        recordStore.put({
          ...record,
          createdAt,
        });

        transaction.oncomplete = () => {
          finish(() => {
            resolve();
          });
        };

        transaction.onerror = () => {
          finish(() => {
            reject(new Error("家族共有暗号化PoCの保存トランザクションに失敗しました。"));
          });
        };

        transaction.onabort = () => {
          finish(() => {
            reject(new Error("家族共有暗号化PoCの保存トランザクションが中断されました。"));
          });
        };
      }),
  );
}

async function clearStoredFamilyBundle() {
  await openDatabase().then(
    (database) =>
      new Promise<void>((resolve, reject) => {
        let settled = false;
        const transaction = database.transaction([KEY_STORE, RECORD_STORE], "readwrite");
        const keyStore = transaction.objectStore(KEY_STORE);
        const recordStore = transaction.objectStore(RECORD_STORE);
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          database.close();
          callback();
        };

        keyStore.delete(PARENT_KEYPAIR_ID);
        keyStore.delete(CHILD_KEYPAIR_ID);
        recordStore.delete(RECORD_ID);

        transaction.oncomplete = () => {
          finish(() => {
            resolve();
          });
        };

        transaction.onerror = () => {
          finish(() => {
            reject(new Error("家族共有暗号化PoCの削除トランザクションに失敗しました。"));
          });
        };

        transaction.onabort = () => {
          finish(() => {
            reject(new Error("家族共有暗号化PoCの削除トランザクションが中断されました。"));
          });
        };
      }),
  );
}

function matchesSamplePayload(payload: FamilyKeySharingPocSample) {
  return JSON.stringify(payload) === JSON.stringify(createSamplePayload());
}

function getKeyRecordForRole(bundle: StoredFamilyBundle, role: FamilyKeySharingPocRole) {
  return role === "parent" ? bundle.parentKeyRecord : bundle.childKeyRecord;
}

function getWrappedDekForRole(record: StoredFamilyRecord, role: FamilyKeySharingPocRole) {
  return role === "parent" ? record.parentWrappedDek : record.childWrappedDek;
}

export async function loadFamilyKeySharingPocSnapshot(): Promise<FamilyKeySharingPocSnapshot> {
  if (!canUseFamilyKeySharingPoc()) {
    return {
      hasParentKeyPair: false,
      hasChildKeyPair: false,
      hasFamilyRecord: false,
      storedCreatedAt: null,
    };
  }

  const bundle = await loadStoredFamilyBundle();

  return {
    hasParentKeyPair: Boolean(bundle.parentKeyRecord?.publicKey && bundle.parentKeyRecord.privateKey),
    hasChildKeyPair: Boolean(bundle.childKeyRecord?.publicKey && bundle.childKeyRecord.privateKey),
    hasFamilyRecord: Boolean(bundle.familyRecord),
    storedCreatedAt: bundle.familyRecord?.createdAt ?? null,
  };
}

export async function runFamilyKeySharingPocEncryption() {
  if (!canUseFamilyKeySharingPoc()) {
    throw new Error("このブラウザでは家族共有暗号化PoCを実行できません。");
  }

  const completedSteps: FamilyKeySharingPocStep[] = [];
  let currentStep: FamilyKeySharingPocStep | null = null;

  try {
    currentStep = "dekGenerated";
    const dek = await generateDek();
    completedSteps.push(currentStep);

    const payload = createSamplePayload();
    const iv = getRandomIv();
    const encoded = new TextEncoder().encode(JSON.stringify(payload));

    currentStep = "encrypted";
    const cipherText = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: toCryptoIv(iv),
      },
      dek,
      encoded,
    );
    completedSteps.push(currentStep);

    currentStep = "parentKeyPairGenerated";
    const parentKeyPair = await generateWrapKeyPair();
    completedSteps.push(currentStep);

    currentStep = "childKeyPairGenerated";
    const childKeyPair = await generateWrapKeyPair();
    completedSteps.push(currentStep);

    currentStep = "parentWrapped";
    const parentWrappedDek = await window.crypto.subtle.wrapKey(
      "raw",
      dek,
      parentKeyPair.publicKey,
      { name: "RSA-OAEP" },
    );
    completedSteps.push(currentStep);

    currentStep = "childWrapped";
    const childWrappedDek = await window.crypto.subtle.wrapKey(
      "raw",
      dek,
      childKeyPair.publicKey,
      { name: "RSA-OAEP" },
    );
    completedSteps.push(currentStep);

    currentStep = "saved";
    await saveStoredFamilyBundle(parentKeyPair, childKeyPair, {
      id: RECORD_ID,
      scope: "family-key-sharing-poc",
      sampleVersion: FAMILY_POC_SAMPLE_VERSION,
      cipherAlgorithm: "AES-GCM",
      wrapAlgorithm: "RSA-OAEP",
      iv,
      cipherText,
      parentWrappedDek,
      childWrappedDek,
      createdAt: new Date().toISOString(),
    });
    completedSteps.push(currentStep);

    return {
      payload,
      completedSteps,
      snapshot: await loadFamilyKeySharingPocSnapshot(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "家族共有暗号化PoCの保存に失敗しました。";
    throw new FamilyKeySharingPocFlowError(
      message,
      completedSteps,
      currentStep && !completedSteps.includes(currentStep) ? currentStep : null,
    );
  }
}

export async function decryptStoredFamilyKeySharingPoc(role: FamilyKeySharingPocRole) {
  if (!canUseFamilyKeySharingPoc()) {
    throw new Error("このブラウザでは家族共有暗号化PoCを実行できません。");
  }

  const bundle = await loadStoredFamilyBundle();
  const keyRecord = getKeyRecordForRole(bundle, role);
  const wrappedRecord = bundle.familyRecord;
  const completedSteps: FamilyKeySharingPocStep[] = [];
  const roleLabel = role === "parent" ? "parent" : "child";

  if (!keyRecord?.privateKey) {
    throw new Error(role === "parent" ? "保存済みの親秘密鍵が見つかりませんでした。" : "保存済みの子秘密鍵が見つかりませんでした。");
  }
  completedSteps.push(role === "parent" ? "parentKeyLoaded" : "childKeyLoaded");

  if (!wrappedRecord) {
    throw new Error("保存済みの家族共有PoCデータが見つかりませんでした。");
  }

  const unwrappedDek = await window.crypto.subtle.unwrapKey(
    "raw",
    getWrappedDekForRole(wrappedRecord, role),
    keyRecord.privateKey,
    { name: "RSA-OAEP" },
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"],
  );
  completedSteps.push(role === "parent" ? "parentUnwrapped" : "childUnwrapped");

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toCryptoIv(wrappedRecord.iv),
    },
    unwrappedDek,
    wrappedRecord.cipherText,
  );
  completedSteps.push(role === "parent" ? "parentDecrypted" : "childDecrypted");

  const payload = JSON.parse(new TextDecoder().decode(decrypted)) as FamilyKeySharingPocSample;
  const matches = matchesSamplePayload(payload);

  if (matches) {
    completedSteps.push(role === "parent" ? "parentMatched" : "childMatched");
  }

  return {
    payload,
    matches,
    role: roleLabel,
    completedSteps,
    snapshot: await loadFamilyKeySharingPocSnapshot(),
  };
}

export async function runFamilyKeySharingNegativeTest() {
  if (!canUseFamilyKeySharingPoc()) {
    throw new Error("このブラウザでは家族共有暗号化PoCを実行できません。");
  }

  const bundle = await loadStoredFamilyBundle();

  if (!bundle.parentKeyRecord?.privateKey || !bundle.childKeyRecord?.privateKey || !bundle.familyRecord) {
    throw new Error("誤鍵テストに必要な家族共有PoCデータが見つかりませんでした。");
  }

  let parentWrappedRejectedByChild = false;
  let childWrappedRejectedByParent = false;

  try {
    await window.crypto.subtle.unwrapKey(
      "raw",
      bundle.familyRecord.parentWrappedDek,
      bundle.childKeyRecord.privateKey,
      { name: "RSA-OAEP" },
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["decrypt"],
    );
  } catch {
    parentWrappedRejectedByChild = true;
  }

  try {
    await window.crypto.subtle.unwrapKey(
      "raw",
      bundle.familyRecord.childWrappedDek,
      bundle.parentKeyRecord.privateKey,
      { name: "RSA-OAEP" },
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["decrypt"],
    );
  } catch {
    childWrappedRejectedByParent = true;
  }

  return {
    parentWrappedRejectedByChild,
    childWrappedRejectedByParent,
    completedSteps: [
      ...(parentWrappedRejectedByChild ? (["parentWrappedRejectedByChild"] as const) : []),
      ...(childWrappedRejectedByParent ? (["childWrappedRejectedByParent"] as const) : []),
    ],
  };
}

export async function clearFamilyKeySharingPocData() {
  if (!canUseFamilyKeySharingPoc()) {
    return;
  }

  await clearStoredFamilyBundle();
}
