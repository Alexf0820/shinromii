"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearDekWrapPocData,
  DekWrapPocFlowError,
  decryptStoredDekWrapPoc,
  loadDekWrapPocSnapshot,
  runDekWrapPocEncryption,
  type DekWrapPocStep,
  type DekWrapPocSample,
} from "@/lib/shinromii-dek-wrap-poc";

type StepStatus = "idle" | "success" | "error";

type StepState = {
  dekGenerated: StepStatus;
  encrypted: StepStatus;
  keyPairGenerated: StepStatus;
  wrapped: StepStatus;
  saved: StepStatus;
  reloaded: StepStatus;
  unwrapped: StepStatus;
  decrypted: StepStatus;
  matched: StepStatus;
};

function createStepState(): StepState {
  return {
    dekGenerated: "idle",
    encrypted: "idle",
    keyPairGenerated: "idle",
    wrapped: "idle",
    saved: "idle",
    reloaded: "idle",
    unwrapped: "idle",
    decrypted: "idle",
    matched: "idle",
  };
}

function statusLabel(status: StepStatus) {
  if (status === "success") return "成功";
  if (status === "error") return "失敗";
  return "未実行";
}

function formatPayload(payload: DekWrapPocSample | null) {
  return payload ? JSON.stringify(payload, null, 2) : "";
}

function buildStepState(completedSteps: DekWrapPocStep[] = [], failedStep: DekWrapPocStep | null = null): StepState {
  const nextState = createStepState();

  completedSteps.forEach((step) => {
    nextState[step] = "success";
  });

  if (failedStep) {
    nextState[failedStep] = "error";
  }

  return nextState;
}

export function AdminDekWrapPocPanel() {
  const [steps, setSteps] = useState<StepState>(createStepState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storedAt, setStoredAt] = useState<string | null>(null);
  const [payloadPreview, setPayloadPreview] = useState<string>("");
  const inspectionRevision = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const revision = inspectionRevision.current;

    const inspect = async () => {
      try {
        const snapshot = await loadDekWrapPocSnapshot();
        if (cancelled || revision !== inspectionRevision.current) return;

        setStoredAt(snapshot.storedCreatedAt);
        setSteps((current) => ({
          ...current,
          reloaded: snapshot.hasKeyPair && snapshot.hasWrappedRecord ? "success" : current.reloaded,
        }));
      } catch {
        if (cancelled || revision !== inspectionRevision.current) return;
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
      { label: "JSON暗号化成功", status: steps.encrypted },
      { label: "ユーザー鍵ペア生成成功", status: steps.keyPairGenerated },
      { label: "DEKラップ成功", status: steps.wrapped },
      { label: "IndexedDB保存成功", status: steps.saved },
      { label: "再読込後取得成功", status: steps.reloaded },
      { label: "DEKアンラップ成功", status: steps.unwrapped },
      { label: "JSON復号成功", status: steps.decrypted },
      { label: "元データ一致", status: steps.matched },
    ],
    [steps],
  );

  async function handleEncryptAndSave() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);
    setPayloadPreview("");
    setSteps(createStepState());

    try {
      const result = await runDekWrapPocEncryption();
      setSteps({
        ...buildStepState(result.completedSteps),
        reloaded: result.snapshot.hasKeyPair && result.snapshot.hasWrappedRecord ? "success" : "idle",
        unwrapped: "idle",
        decrypted: "idle",
        matched: "idle",
      });
      setStoredAt(result.snapshot.storedCreatedAt);
      setPayloadPreview(formatPayload(result.payload));
      setMessage("PoC用JSONをAES-GCMで暗号化し、RSA-OAEPでラップしたDEKと一緒にIndexedDBへ保存しました。");
    } catch (error) {
      const nextSteps =
        error instanceof DekWrapPocFlowError ? buildStepState(error.completedSteps, error.failedStep) : createStepState();
      setSteps(nextSteps);
      setMessage(error instanceof Error ? error.message : "DEKラップPoCの保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecrypt() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);

    try {
      const result = await decryptStoredDekWrapPoc();
      setSteps((current) => ({
        ...current,
        reloaded: result.snapshot.hasKeyPair && result.snapshot.hasWrappedRecord ? "success" : current.reloaded,
        unwrapped: "success",
        decrypted: "success",
        matched: result.matches ? "success" : "error",
      }));
      setStoredAt(result.snapshot.storedCreatedAt);
      setPayloadPreview(formatPayload(result.payload));
      setMessage(result.matches ? "秘密鍵でDEKをアンラップし、保存済みJSONの復号と一致確認に成功しました。" : "復号はできましたが、元JSONと一致しませんでした。");
    } catch (error) {
      setSteps((current) => ({
        ...current,
        unwrapped: "error",
        decrypted: "error",
        matched: "error",
      }));
      setMessage(error instanceof Error ? error.message : "保存済みDEKラップPoCの復号に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);

    try {
      await clearDekWrapPocData();
      setStoredAt(null);
      setPayloadPreview("");
      setSteps(createStepState());
      setMessage("PoC用の鍵ペア・ラップ済みDEK・暗号文をIndexedDBから削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DEKラップPoCデータの削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-choice">
      <strong>DEKラップPoC</strong>
      <span>
        架空JSONを AES-256-GCM で暗号化し、その DEK を RSA-OAEP 公開鍵でラップします。
        <br />
        秘密鍵とラップ済みDEKは IndexedDB にのみ保持し、localStorage へ平文保存しません。
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
          暗号化してラップ保存
        </button>
        <button type="button" className="action-button subtle" onClick={() => window.location.reload()} disabled={loading}>
          ページを再読込
        </button>
        <button type="button" className="action-button subtle" onClick={handleDecrypt} disabled={loading}>
          保存済みデータをアンラップ復号
        </button>
        <button type="button" className="action-button danger" onClick={handleClear} disabled={loading}>
          PoCデータを削除
        </button>
      </div>
      <div className="admin-crypto-meta">
        <p>保存先: IndexedDB `SHINROMII_DEK_WRAP_POC`</p>
        <p>暗号方式: AES-256-GCM / RSA-OAEP(SHA-256) / ランダムIV</p>
        <p>保存済み日時: {storedAt ?? "未保存"}</p>
      </div>
      {message ? <p className="admin-crypto-message">{message}</p> : null}
      {payloadPreview ? (
        <pre className="admin-crypto-preview" aria-label="DEK wrap PoC payload preview">
          {payloadPreview}
        </pre>
      ) : null}
    </div>
  );
}
