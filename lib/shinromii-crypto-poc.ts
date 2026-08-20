export const SHINROMII_CRYPTO_POC_DB = "SHINROMII_CRYPTO_POC";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const RECORD_STORE = "records";

const POC_KEY_ID = "dek";
const POC_RECORD_ID = "sample";

export type CryptoPocSample = {
  scope: "crypto-poc";
  version: "0.831";
  studentAlias: string;
  memo: string;
  sampleGrades: Array<{
    subject: string;
    score: number;
  }>;
};

type StoredEncryptedRecord = {
  id: string;
  algorithm: "AES-GCM";
  iv: Uint8Array;
  cipherText: ArrayBuffer;
  createdAt: string;
};

type CryptoPocSnapshot = {
  hasKey: boolean;
  hasEncryptedRecord: boolean;
  storedCreatedAt: string | null;
};

function canUseCryptoPoc() {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined"
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseCryptoPoc()) {
      reject(new Error("このブラウザでは暗号化PoCを実行できません。"));
      return;
    }

    const request = window.indexedDB.open(SHINROMII_CRYPTO_POC_DB, DB_VERSION);

    request.onerror = () => {
      reject(new Error("暗号化PoC用のIndexedDBを開けませんでした。"));
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
      resolve(request.result);
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
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = execute(store);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new Error("暗号化PoCのIndexedDB処理に失敗しました。"));
        };

        transaction.oncomplete = () => {
          database.close();
        };

        transaction.onerror = () => {
          reject(new Error("暗号化PoCのIndexedDBトランザクションに失敗しました。"));
        };
      }),
  );
}

function createSamplePayload(): CryptoPocSample {
  return {
    scope: "crypto-poc",
    version: "0.831",
    studentAlias: "体験用サンプル",
    memo: "実ユーザーデータではない暗号化PoC用のJSONです。",
    sampleGrades: [
      { subject: "英語", score: 4 },
      { subject: "数学", score: 3 },
      { subject: "情報", score: 5 },
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
    false,
    ["encrypt", "decrypt"],
  );
}

async function loadStoredKey() {
  const result = await runStoreRequest("readonly", KEY_STORE, (store) => store.get(POC_KEY_ID));
  const record = result as { id: string; key: CryptoKey; createdAt: string } | undefined;
  return record?.key ?? null;
}

async function saveKey(key: CryptoKey) {
  await runStoreRequest("readwrite", KEY_STORE, (store) =>
    store.put({
      id: POC_KEY_ID,
      key,
      createdAt: new Date().toISOString(),
    }),
  );
}

async function saveEncryptedRecord(record: StoredEncryptedRecord) {
  await runStoreRequest("readwrite", RECORD_STORE, (store) => store.put(record));
}

export async function loadCryptoPocSnapshot(): Promise<CryptoPocSnapshot> {
  if (!canUseCryptoPoc()) {
    return {
      hasKey: false,
      hasEncryptedRecord: false,
      storedCreatedAt: null,
    };
  }

  const [keyResult, recordResult] = await Promise.all([
    runStoreRequest("readonly", KEY_STORE, (store) => store.get(POC_KEY_ID)),
    runStoreRequest("readonly", RECORD_STORE, (store) => store.get(POC_RECORD_ID)),
  ]);

  const keyRecord = keyResult as { id: string; key: CryptoKey; createdAt: string } | undefined;
  const encryptedRecord = recordResult as StoredEncryptedRecord | undefined;

  return {
    hasKey: Boolean(keyRecord?.key),
    hasEncryptedRecord: Boolean(encryptedRecord),
    storedCreatedAt: encryptedRecord?.createdAt ?? null,
  };
}

export async function runCryptoPocEncryption() {
  if (!canUseCryptoPoc()) {
    throw new Error("このブラウザでは暗号化PoCを実行できません。");
  }

  const key = await generateDek();
  const iv = getRandomIv();
  const payload = createSamplePayload();
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const cipherText = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toCryptoIv(iv),
    },
    key,
    encoded,
  );

  await saveKey(key);
  await saveEncryptedRecord({
    id: POC_RECORD_ID,
    algorithm: "AES-GCM",
    iv,
    cipherText,
    createdAt: new Date().toISOString(),
  });

  return {
    payload,
    snapshot: await loadCryptoPocSnapshot(),
  };
}

export async function decryptStoredCryptoPoc() {
  if (!canUseCryptoPoc()) {
    throw new Error("このブラウザでは暗号化PoCを実行できません。");
  }

  const [key, recordResult] = await Promise.all([
    loadStoredKey(),
    runStoreRequest("readonly", RECORD_STORE, (store) => store.get(POC_RECORD_ID)),
  ]);

  if (!key) {
    throw new Error("保存済みDEKが見つかりませんでした。");
  }

  const record = recordResult as StoredEncryptedRecord | undefined;

  if (!record) {
    throw new Error("保存済み暗号文が見つかりませんでした。");
  }

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toCryptoIv(record.iv),
    },
    key,
    record.cipherText,
  );

  const json = JSON.parse(new TextDecoder().decode(decrypted)) as CryptoPocSample;
  const expected = JSON.stringify(createSamplePayload());
  const actual = JSON.stringify(json);

  return {
    payload: json,
    matches: actual === expected,
    snapshot: await loadCryptoPocSnapshot(),
  };
}

export async function clearCryptoPocData() {
  if (!canUseCryptoPoc()) {
    return;
  }

  await Promise.all([
    runStoreRequest("readwrite", KEY_STORE, (store) => store.delete(POC_KEY_ID)),
    runStoreRequest("readwrite", RECORD_STORE, (store) => store.delete(POC_RECORD_ID)),
  ]);
}
