export const SHINROMII_DEK_WRAP_POC_DB = "SHINROMII_DEK_WRAP_POC";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const RECORD_STORE = "records";

const KEYPAIR_ID = "rsa-oaep-keypair";
const RECORD_ID = "wrapped-sample";

export type DekWrapPocStep =
  | "dekGenerated"
  | "encrypted"
  | "keyPairGenerated"
  | "wrapped"
  | "saved";

export type DekWrapPocSample = {
  scope: "dek-wrap-poc";
  version: "0.84";
  studentAlias: string;
  note: string;
  targetSchools: Array<{
    name: string;
    reason: string;
  }>;
};

type StoredKeyPairRecord = {
  id: string;
  algorithm: "RSA-OAEP";
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  createdAt: string;
};

type StoredWrappedRecord = {
  id: string;
  wrapAlgorithm: "RSA-OAEP";
  cipherAlgorithm: "AES-GCM";
  iv: Uint8Array;
  cipherText: ArrayBuffer;
  wrappedDek: ArrayBuffer;
  createdAt: string;
};

type DekWrapPocSnapshot = {
  hasKeyPair: boolean;
  hasWrappedRecord: boolean;
  storedCreatedAt: string | null;
};

export class DekWrapPocFlowError extends Error {
  completedSteps: DekWrapPocStep[];
  failedStep: DekWrapPocStep | null;

  constructor(message: string, completedSteps: DekWrapPocStep[], failedStep: DekWrapPocStep | null) {
    super(message);
    this.name = "DekWrapPocFlowError";
    this.completedSteps = completedSteps;
    this.failedStep = failedStep;
  }
}

function canUseDekWrapPoc() {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined"
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseDekWrapPoc()) {
      reject(new Error("このブラウザではDEKラップPoCを実行できません。"));
      return;
    }

    let settled = false;
    const request = window.indexedDB.open(SHINROMII_DEK_WRAP_POC_DB, DB_VERSION);
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };

    request.onerror = () => {
      settle(() => {
        reject(new Error("DEKラップPoC用のIndexedDBを開けませんでした。"));
      });
    };

    request.onblocked = () => {
      settle(() => {
        reject(new Error("他のタブがDEKラップPoC用のIndexedDBを使用中です。他のタブを閉じてから再実行してください。"));
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

function runStoreRequest<T>(
  mode: IDBTransactionMode,
  storeName: string,
  execute: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        let settled = false;
        let requestResult: T;
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = execute(store);
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          database.close();
          callback();
        };

        request.onsuccess = () => {
          requestResult = request.result;
        };

        request.onerror = () => {
          finish(() => {
            reject(new Error("DEKラップPoCのIndexedDB処理に失敗しました。"));
          });
        };

        transaction.oncomplete = () => {
          finish(() => {
            resolve(requestResult);
          });
        };

        transaction.onerror = () => {
          finish(() => {
            reject(new Error("DEKラップPoCのIndexedDBトランザクションに失敗しました。"));
          });
        };

        transaction.onabort = () => {
          finish(() => {
            reject(new Error("DEKラップPoCのIndexedDBトランザクションが中断されました。"));
          });
        };
      }),
  );
}

function createSamplePayload(): DekWrapPocSample {
  return {
    scope: "dek-wrap-poc",
    version: "0.84",
    studentAlias: "体験用サンプル",
    note: "実ユーザーデータではない、DEKラップPoC用のJSONです。",
    targetSchools: [
      { name: "未来女子大学", reason: "教育学の学びを比較したい" },
      { name: "青葉国際大学", reason: "英語活用の環境を確認したい" },
    ],
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

async function loadStoredKeyPair() {
  const result = await runStoreRequest("readonly", KEY_STORE, (store) => store.get(KEYPAIR_ID));
  return (result as StoredKeyPairRecord | undefined) ?? null;
}

async function saveKeyPairAndWrappedRecord(keyPair: CryptoKeyPair, record: StoredWrappedRecord) {
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
          id: KEYPAIR_ID,
          algorithm: "RSA-OAEP",
          publicKey: keyPair.publicKey,
          privateKey: keyPair.privateKey,
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
            reject(new Error("DEKラップPoCの保存トランザクションに失敗しました。"));
          });
        };

        transaction.onabort = () => {
          finish(() => {
            reject(new Error("DEKラップPoCの保存トランザクションが中断されました。"));
          });
        };
      }),
  );
}

export async function loadDekWrapPocSnapshot(): Promise<DekWrapPocSnapshot> {
  if (!canUseDekWrapPoc()) {
    return {
      hasKeyPair: false,
      hasWrappedRecord: false,
      storedCreatedAt: null,
    };
  }

  const [keyResult, recordResult] = await Promise.all([
    runStoreRequest("readonly", KEY_STORE, (store) => store.get(KEYPAIR_ID)),
    runStoreRequest("readonly", RECORD_STORE, (store) => store.get(RECORD_ID)),
  ]);

  const keyPair = keyResult as StoredKeyPairRecord | undefined;
  const wrappedRecord = recordResult as StoredWrappedRecord | undefined;

  return {
    hasKeyPair: Boolean(keyPair?.publicKey && keyPair.privateKey),
    hasWrappedRecord: Boolean(wrappedRecord),
    storedCreatedAt: wrappedRecord?.createdAt ?? null,
  };
}

export async function runDekWrapPocEncryption() {
  if (!canUseDekWrapPoc()) {
    throw new Error("このブラウザではDEKラップPoCを実行できません。");
  }

  const completedSteps: DekWrapPocStep[] = [];
  let currentStep: DekWrapPocStep | null = null;

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

    currentStep = "keyPairGenerated";
    const keyPair = await generateWrapKeyPair();
    completedSteps.push(currentStep);

    currentStep = "wrapped";
    const wrappedDek = await window.crypto.subtle.wrapKey(
      "raw",
      dek,
      keyPair.publicKey,
      {
        name: "RSA-OAEP",
      },
    );
    completedSteps.push(currentStep);

    currentStep = "saved";
    await saveKeyPairAndWrappedRecord(keyPair, {
      id: RECORD_ID,
      wrapAlgorithm: "RSA-OAEP",
      cipherAlgorithm: "AES-GCM",
      iv,
      cipherText,
      wrappedDek,
      createdAt: new Date().toISOString(),
    });
    completedSteps.push(currentStep);

    return {
      payload,
      completedSteps,
      snapshot: await loadDekWrapPocSnapshot(),
    };
  } catch (error) {
    if (error instanceof DekWrapPocFlowError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "DEKラップPoCの保存に失敗しました。";
    throw new DekWrapPocFlowError(message, completedSteps, currentStep && !completedSteps.includes(currentStep) ? currentStep : null);
  }
}

export async function decryptStoredDekWrapPoc() {
  if (!canUseDekWrapPoc()) {
    throw new Error("このブラウザではDEKラップPoCを実行できません。");
  }

  const [keyPairRecord, recordResult] = await Promise.all([
    loadStoredKeyPair(),
    runStoreRequest("readonly", RECORD_STORE, (store) => store.get(RECORD_ID)),
  ]);

  if (!keyPairRecord?.privateKey) {
    throw new Error("保存済み秘密鍵が見つかりませんでした。");
  }

  const record = recordResult as StoredWrappedRecord | undefined;

  if (!record) {
    throw new Error("保存済みラップ済みDEKが見つかりませんでした。");
  }

  const unwrappedDek = await window.crypto.subtle.unwrapKey(
    "raw",
    record.wrappedDek,
    keyPairRecord.privateKey,
    {
      name: "RSA-OAEP",
    },
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"],
  );

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toCryptoIv(record.iv),
    },
    unwrappedDek,
    record.cipherText,
  );

  const json = JSON.parse(new TextDecoder().decode(decrypted)) as DekWrapPocSample;
  const expected = JSON.stringify(createSamplePayload());
  const actual = JSON.stringify(json);

  return {
    payload: json,
    matches: actual === expected,
    snapshot: await loadDekWrapPocSnapshot(),
  };
}

export async function clearDekWrapPocData() {
  if (!canUseDekWrapPoc()) {
    return;
  }

  await Promise.all([
    runStoreRequest("readwrite", KEY_STORE, (store) => store.delete(KEYPAIR_ID)),
    runStoreRequest("readwrite", RECORD_STORE, (store) => store.delete(RECORD_ID)),
  ]);
}
