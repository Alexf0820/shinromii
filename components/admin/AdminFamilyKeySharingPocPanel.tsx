"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearFamilyKeySharingPocData,
  decryptStoredFamilyKeySharingPoc,
  FamilyKeySharingPocFlowError,
  loadFamilyKeySharingPocSnapshot,
  runFamilyKeySharingNegativeTest,
  runFamilyKeySharingPocEncryption,
  type FamilyKeySharingPocSample,
  type FamilyKeySharingPocStep,
} from "@/lib/shinromii-family-key-sharing-poc";

type StepStatus = "idle" | "success" | "error";

type StepState = {
  dekGenerated: StepStatus;
  encrypted: StepStatus;
  parentKeyPairGenerated: StepStatus;
  childKeyPairGenerated: StepStatus;
  parentWrapped: StepStatus;
  childWrapped: StepStatus;
  saved: StepStatus;
  reloaded: StepStatus;
  parentKeyLoaded: StepStatus;
  parentUnwrapped: StepStatus;
  parentDecrypted: StepStatus;
  parentMatched: StepStatus;
  childKeyLoaded: StepStatus;
  childUnwrapped: StepStatus;
  childDecrypted: StepStatus;
  childMatched: StepStatus;
  parentWrappedRejectedByChild: StepStatus;
  childWrappedRejectedByParent: StepStatus;
};

function createStepState(): StepState {
  return {
    dekGenerated: "idle",
    encrypted: "idle",
    parentKeyPairGenerated: "idle",
    childKeyPairGenerated: "idle",
    parentWrapped: "idle",
    childWrapped: "idle",
    saved: "idle",
    reloaded: "idle",
    parentKeyLoaded: "idle",
    parentUnwrapped: "idle",
    parentDecrypted: "idle",
    parentMatched: "idle",
    childKeyLoaded: "idle",
    childUnwrapped: "idle",
    childDecrypted: "idle",
    childMatched: "idle",
    parentWrappedRejectedByChild: "idle",
    childWrappedRejectedByParent: "idle",
  };
}

function statusLabel(status: StepStatus) {
  if (status === "success") return "成功";
  if (status === "error") return "失敗";
  return "未実行";
}

function formatPayload(payload: FamilyKeySharingPocSample | null) {
  return payload ? JSON.stringify(payload, null, 2) : "";
}

function buildStepState(completedSteps: FamilyKeySharingPocStep[] = [], failedStep: FamilyKeySharingPocStep | null = null) {
  const nextState = createStepState();

  completedSteps.forEach((step) => {
    nextState[step] = "success";
  });

  if (failedStep) {
    nextState[failedStep] = "error";
  }

  return nextState;
}

function mergeRoleSteps(
  current: StepState,
  role: "parent" | "child",
  completedSteps: FamilyKeySharingPocStep[] = [],
  failedStep: FamilyKeySharingPocStep | null = null,
  matches: boolean | null = null,
): StepState {
  const nextState = { ...current };
  const roleKeys: Array<keyof StepState> =
    role === "parent"
      ? ["parentKeyLoaded", "parentUnwrapped", "parentDecrypted", "parentMatched"]
      : ["childKeyLoaded", "childUnwrapped", "childDecrypted", "childMatched"];

  roleKeys.forEach((key) => {
    nextState[key] = "idle";
  });

  completedSteps.forEach((step) => {
    if (step in nextState) {
      nextState[step as keyof StepState] = "success";
    }
  });

  if (failedStep && roleKeys.includes(failedStep)) {
    nextState[failedStep] = "error";
  }

  const matchedKey = role === "parent" ? "parentMatched" : "childMatched";
  if (matches !== null) {
    nextState[matchedKey] = matches ? "success" : "error";
  }

  return nextState;
}

export function AdminFamilyKeySharingPocPanel() {
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
        const snapshot = await loadFamilyKeySharingPocSnapshot();
        if (cancelled || revision !== inspectionRevision.current) return;

        setStoredAt(snapshot.storedCreatedAt);
        setSteps((current) => ({
          ...current,
          reloaded: snapshot.hasParentKeyPair && snapshot.hasChildKeyPair && snapshot.hasFamilyRecord ? "success" : current.reloaded,
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
      { label: "Student Profile DEK生成", status: steps.dekGenerated },
      { label: "進路JSON暗号化", status: steps.encrypted },
      { label: "親鍵ペア生成", status: steps.parentKeyPairGenerated },
      { label: "子鍵ペア生成", status: steps.childKeyPairGenerated },
      { label: "親用DEKラップ", status: steps.parentWrapped },
      { label: "子用DEKラップ", status: steps.childWrapped },
      { label: "atomic保存", status: steps.saved },
      { label: "再読込後取得", status: steps.reloaded },
      { label: "親秘密鍵取得", status: steps.parentKeyLoaded },
      { label: "親用DEKアンラップ", status: steps.parentUnwrapped },
      { label: "親でJSON復号", status: steps.parentDecrypted },
      { label: "親で元データ一致", status: steps.parentMatched },
      { label: "子秘密鍵取得", status: steps.childKeyLoaded },
      { label: "子用DEKアンラップ", status: steps.childUnwrapped },
      { label: "子でJSON復号", status: steps.childDecrypted },
      { label: "子で元データ一致", status: steps.childMatched },
      { label: "親用wrapped DEKは子で開けない", status: steps.parentWrappedRejectedByChild },
      { label: "子用wrapped DEKは親で開けない", status: steps.childWrappedRejectedByParent },
    ],
    [steps],
  );

  async function handleCreate() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);
    setPayloadPreview("");
    setSteps(createStepState());

    try {
      const result = await runFamilyKeySharingPocEncryption();
      setSteps({
        ...buildStepState(result.completedSteps),
        reloaded: "idle",
        parentKeyLoaded: "idle",
        parentUnwrapped: "idle",
        parentDecrypted: "idle",
        parentMatched: "idle",
        childKeyLoaded: "idle",
        childUnwrapped: "idle",
        childDecrypted: "idle",
        childMatched: "idle",
        parentWrappedRejectedByChild: "idle",
        childWrappedRejectedByParent: "idle",
      });
      setStoredAt(result.snapshot.storedCreatedAt);
      setPayloadPreview(formatPayload(result.payload));
      setMessage("親鍵・子鍵で同じDEKを別々にラップし、家族共有PoC一式をIndexedDBへatomic保存しました。");
    } catch (error) {
      const nextSteps =
        error instanceof FamilyKeySharingPocFlowError ? buildStepState(error.completedSteps, error.failedStep) : createStepState();
      setSteps(nextSteps);
      setMessage(error instanceof Error ? error.message : "家族共有暗号化PoCの保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecrypt(role: "parent" | "child") {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);

    try {
      const result = await decryptStoredFamilyKeySharingPoc(role);
      setSteps((current) => ({
        ...mergeRoleSteps(current, role, result.completedSteps, null, result.matches),
        reloaded: result.snapshot.hasParentKeyPair && result.snapshot.hasChildKeyPair && result.snapshot.hasFamilyRecord ? "success" : current.reloaded,
      }));
      setStoredAt(result.snapshot.storedCreatedAt);
      setPayloadPreview(formatPayload(result.payload));
      setMessage(
        role === "parent"
          ? result.matches
            ? "親秘密鍵でDEKをアンラップし、家族共有JSONの復号と一致確認に成功しました。"
            : "親側の復号はできましたが、元JSONと一致しませんでした。"
          : result.matches
            ? "子秘密鍵でDEKをアンラップし、家族共有JSONの復号と一致確認に成功しました。"
            : "子側の復号はできましたが、元JSONと一致しませんでした。",
      );
    } catch (error) {
      if (error instanceof FamilyKeySharingPocFlowError) {
        setSteps((current) => mergeRoleSteps(current, role, error.completedSteps, error.failedStep));
        setMessage(error.message);
      } else {
        setSteps((current) => mergeRoleSteps(current, role, [], role === "parent" ? "parentKeyLoaded" : "childKeyLoaded"));
        setMessage(error instanceof Error ? error.message : "家族共有暗号化PoCの復号に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleNegativeTest() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);

    try {
      const result = await runFamilyKeySharingNegativeTest();
      setSteps((current) => ({
        ...current,
        parentWrappedRejectedByChild: result.parentWrappedRejectedByChild ? "success" : "error",
        childWrappedRejectedByParent: result.childWrappedRejectedByParent ? "success" : "error",
      }));
      setMessage(
        result.parentWrappedRejectedByChild && result.childWrappedRejectedByParent
          ? "誤った秘密鍵では wrapped DEK を開けないことを確認しました。"
          : "誤鍵テストで想定外の結果がありました。",
      );
    } catch (error) {
      setSteps((current) => ({
        ...current,
        parentWrappedRejectedByChild: "error",
        childWrappedRejectedByParent: "error",
      }));
      setMessage(error instanceof Error ? error.message : "誤鍵テストに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);

    try {
      await clearFamilyKeySharingPocData();
      setStoredAt(null);
      setPayloadPreview("");
      setSteps(createStepState());
      setMessage("家族共有暗号化PoCの鍵・wrapped DEK・暗号文をIndexedDBからatomic削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "家族共有暗号化PoCデータの削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-choice">
      <strong>Ver.0.87 家族共有暗号化PoC</strong>
      <span>
        1つのStudent Profile DEKで架空の進路JSONを暗号化し、そのDEKを親公開鍵と子公開鍵の両方でラップします。
        <br />
        親・子どちらもページ再読込後に同じ暗号文を復号でき、誤った秘密鍵では unwrap できないことを検証します。
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
        <button type="button" className="action-button" onClick={handleCreate} disabled={loading}>
          家族共有PoCを作成
        </button>
        <button type="button" className="action-button subtle" onClick={() => window.location.reload()} disabled={loading}>
          ページを再読込
        </button>
        <button type="button" className="action-button subtle" onClick={() => handleDecrypt("parent")} disabled={loading}>
          親でアンラップ復号
        </button>
        <button type="button" className="action-button subtle" onClick={() => handleDecrypt("child")} disabled={loading}>
          子でアンラップ復号
        </button>
        <button type="button" className="action-button subtle" onClick={handleNegativeTest} disabled={loading}>
          誤鍵テスト
        </button>
        <button type="button" className="action-button danger" onClick={handleClear} disabled={loading}>
          PoCデータを削除
        </button>
      </div>
      <div className="admin-crypto-meta">
        <p>保存先: IndexedDB `SHINROMII_FAMILY_KEY_SHARING_POC`</p>
        <p>暗号方式: AES-256-GCM / RSA-OAEP(SHA-256) / ランダムIV</p>
        <p>保存済み日時: {storedAt ?? "未保存"}</p>
      </div>
      {message ? (
        <p className="admin-crypto-message" role="status" aria-live="polite" aria-atomic="true">
          {message}
        </p>
      ) : null}
      {payloadPreview ? (
        <pre className="admin-crypto-preview" aria-label="Family key sharing PoC payload preview">
          {payloadPreview}
        </pre>
      ) : null}
    </div>
  );
}
