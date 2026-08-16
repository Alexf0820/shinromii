const DB_NAME = "SHINROMII_ATTACHMENTS";
const DB_VERSION = 1;
const STORE_NAME = "attachments";

type AttachmentRecord = {
  id: string;
  ocId: string;
  blob: Blob;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("このブラウザでは添付ファイル保存に対応していません。"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("添付ファイル保存用データベースを開けませんでした。"));
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });

        store.createIndex("by_oc_id", "ocId", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  execute: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);

        execute(store)
          .then(resolve)
          .catch(reject);

        transaction.oncomplete = () => {
          database.close();
        };

        transaction.onerror = () => {
          reject(new Error("添付ファイル保存処理に失敗しました。"));
        };
      }),
  );
}

export function isAttachmentStorageAvailable() {
  return canUseIndexedDb();
}

export async function saveAttachmentBlob(record: AttachmentRecord) {
  return withStore("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("添付ファイルの保存に失敗しました。"));
    });
  });
}

export async function getAttachmentBlob(id: string) {
  return withStore("readonly", (store) => {
    return new Promise<Blob | null>((resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as AttachmentRecord | undefined;
        resolve(result?.blob ?? null);
      };
      request.onerror = () => reject(new Error("添付ファイルの読み込みに失敗しました。"));
    });
  });
}

export async function deleteAttachmentBlob(id: string) {
  return withStore("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("添付ファイルの削除に失敗しました。"));
    });
  });
}

export async function deleteAttachmentBlobsByOcId(ocId: string) {
  return withStore("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const index = store.index("by_oc_id");
      const request = index.openCursor(IDBKeyRange.only(ocId));

      request.onerror = () => reject(new Error("添付ファイルの削除に失敗しました。"));
      request.onsuccess = () => {
        const cursor = request.result;

        if (!cursor) {
          resolve();
          return;
        }

        cursor.delete();
        cursor.continue();
      };
    });
  });
}
