"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearCryptoPocData,
  decryptStoredCryptoPoc,
  loadCryptoPocSnapshot,
  runCryptoPocEncryption,
  type CryptoPocSample,
} from "@/lib/shinromii-crypto-poc";

type StepStatus = "idle" | "success" | "error";

type StepState = {
  dekGenerated: StepStatus;
  encrypted: StepStatus;
  saved: StepStatus;
  reloaded: StepStatus;
  decrypted: StepStatus;
  matched: StepStatus;
};

function createStepState(): StepState {
  return {
    dekGenerated: "idle",
    encrypted: "idle",
    saved: "idle",
    reloaded: "idle",
    decrypted: "idle",
    matched: "idle",
  };
}

function statusLabel(status: StepStatus) {
  if (status === "success") return "成功";
  if (status === "error") return "失敗";
  return "未実行";
}

function formatPayload(payload: CryptoPocSample | null) {
  return payload ? JSON.stringify(payload, null, 2) : "";
}

export function AdminCryptoPocPanel() {
  const [steps, setSteps] = useState<StepState>(createStepState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storedAt, setStoredAt] = useState<string | null>(null);
  const [payloadPreview, setPayloadPreview] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const inspect = async () => {
      try {
        const snapshot = await loadCryptoPocSnapshot();
        if (cancelled) return;

        setStoredAt(snapshot.storedCreatedAt);
        setSteps((current) => ({
          ...current,
          reloaded: snapshot.hasKey && snapshot.hasEncryptedRecord ? "success" : current.reloaded,
        }));
      } catch {
        if (cancelled) return;
        setSteps((current) => ({
          ...current,
          reloaded: "error",
        }));
      }
    };

    void inspect();

    return () => {
      cancelled = true;
    };
  }, []);

  const stepItems = useMemo(
    () => [
      { label: "DEK生成成功", status: steps.dekGenerated },
      { label: "暗号化成功", status: steps.encrypted },
      { label: "IndexedDB保存成功", status: steps.saved },
      { label: "再読込後の取得成功", status: steps.reloaded },
      { label: "復号成功", status: steps.decrypted },
      { label: "元データ一致", status: steps.matched },
    ],
    [steps],
  );

  async function handleEncryptAndSave() {
    setLoading(true);
    setMessage(null);
    setPayloadPreview("");
    setSteps(createStepState());

    try {
      const result = await runCryptoPocEncryption();
      setSteps({
        dekGenerated: "success",
        encrypted: "success",
        saved: "success",
        reloaded: result.snapshot.hasKey && result.snapshot.hasEncryptedRecord ? "success" : "idle",
        decrypted: "idle",
        matched: "idle",
      });
      setStoredAt(result.snapshot.storedCreatedAt);
      setPayloadPreview(formatPayload(result.payload));
      setMessage("PoC用JSONを暗号化し、DEKと暗号文をIndexedDBへ保存しました。");
    } catch (error) {
      setSteps({
        dekGenerated: "error",
        encrypted: "error",
        saved: "error",
        reloaded: "idle",
        decrypted: "idle",
        matched: "idle",
      });
      setMessage(error instanceof Error ? error.message : "暗号化PoCの保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecrypt() {
    setLoading(true);
    setMessage(null);

    try {
      const result = await decryptStoredCryptoPoc();
      setSteps((current) => ({
        ...current,
        reloaded: result.snapshot.hasKey && result.snapshot.hasEncryptedRecord ? "success" : current.reloaded,
        decrypted: "success",
        matched: result.matches ? "success" : "error",
      }));
      setStoredAt(result.snapshot.storedCreatedAt);
      setPayloadPreview(formatPayload(result.payload));
      setMessage(result.matches ? "保存済み暗号文の復号に成功し、元JSONと一致しました。" : "復号はできましたが、元JSONと一致しませんでした。");
    } catch (error) {
      setSteps((current) => ({
        ...current,
        decrypted: "error",
        matched: "error",
      }));
      setMessage(error instanceof Error ? error.message : "保存済み暗号文の復号に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    setLoading(true);
    setMessage(null);

    try {
      await clearCryptoPocData();
      setStoredAt(null);
      setPayloadPreview("");
      setSteps(createStepState());
      setMessage("PoC用の鍵と暗号文をIndexedDBから削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PoCデータの削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-choice">
      <strong>クライアントサイド暗号化PoC</strong>
      <span>
        Web Crypto API の AES-256-GCM と IndexedDB を使い、架空JSONの暗号化・保存・再読込・復号を確認します。
        <br />
        DEKは `extractable: false` で生成し、PoC用IndexedDBへ保存します。実ユーザーデータは使いません。
      </span>
      <ul className="admin-checklist">
        {stepItems.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <strong className={`admin-check-status is-${item.status}`}>{statusLabel(item.status)}</strong>
          </li>
        ))}
      </ul>
      <div className="admin-auth-actions">
        <button type="button" className="action-button" onClick={handleEncryptAndSave} disabled={loading}>
          暗号化して保存
        </button>
        <button type="button" className="action-button subtle" onClick={() => window.location.reload()} disabled={loading}>
          ページを再読込
        </button>
        <button type="button" className="action-button subtle" onClick={handleDecrypt} disabled={loading}>
          保存済みデータを復号
        </button>
        <button type="button" className="action-button danger" onClick={handleClear} disabled={loading}>
          PoCデータを削除
        </button>
      </div>
      <div className="admin-crypto-meta">
        <p>保存先: IndexedDB `SHINROMII_CRYPTO_POC`</p>
        <p>暗号方式: AES-256-GCM / ランダムIV</p>
        <p>保存済み日時: {storedAt ?? "未保存"}</p>
      </div>
      {message ? <p className="admin-crypto-message">{message}</p> : null}
      {payloadPreview ? (
        <pre className="admin-crypto-preview" aria-label="PoC payload preview">
          {payloadPreview}
        </pre>
      ) : null}
    </div>
  );
}
