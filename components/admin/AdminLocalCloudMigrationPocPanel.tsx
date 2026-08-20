"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import {
  clearLocalCloudMigrationPocData,
  loadLocalCloudMigrationPocSnapshot,
  LocalCloudMigrationPocFlowError,
  prepareLocalCloudMigrationPocFixture,
  runLocalCloudMigrationPoc,
  verifyStoredLocalCloudMigrationPoc,
  type LocalCloudMigrationPocStep,
  type LocalCloudMigrationPocFixture,
} from "@/lib/shinromii-local-cloud-migration-poc";

type StepStatus = "idle" | "success" | "error";

type StepState = {
  localPrepared: StepStatus;
  migrationIdGenerated: StepStatus;
  dekGenerated: StepStatus;
  encrypted: StepStatus;
  wrapped: StepStatus;
  uploaded: StepStatus;
  reloaded: StepStatus;
  fetched: StepStatus;
  unwrapped: StepStatus;
  decrypted: StepStatus;
  matched: StepStatus;
  verified: StepStatus;
};

function createStepState(): StepState {
  return {
    localPrepared: "idle",
    migrationIdGenerated: "idle",
    dekGenerated: "idle",
    encrypted: "idle",
    wrapped: "idle",
    uploaded: "idle",
    reloaded: "idle",
    fetched: "idle",
    unwrapped: "idle",
    decrypted: "idle",
    matched: "idle",
    verified: "idle",
  };
}

function statusLabel(status: StepStatus) {
  if (status === "success") return "成功";
  if (status === "error") return "失敗";
  return "未実行";
}

function buildStepState(
  completedSteps: LocalCloudMigrationPocStep[] = [],
  failedStep: LocalCloudMigrationPocStep | null = null,
): StepState {
  const next = createStepState();

  completedSteps.forEach((step) => {
    if (step in next) {
      next[step] = "success";
    }
  });

  if (failedStep && failedStep in next && !completedSteps.includes(failedStep)) {
    next[failedStep] = "error";
  }

  return next;
}

function formatPayload(payload: LocalCloudMigrationPocFixture | null) {
  return payload ? JSON.stringify(payload, null, 2) : "";
}

export function AdminLocalCloudMigrationPocPanel() {
  const [steps, setSteps] = useState<StepState>(createStepState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [payloadPreview, setPayloadPreview] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [migrationId, setMigrationId] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<string>("idle");
  const [localUpdatedAt, setLocalUpdatedAt] = useState<string | null>(null);
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null>(null);
  const inspectionRevision = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const revision = inspectionRevision.current;

    const inspect = async () => {
      try {
        const snapshot = await loadLocalCloudMigrationPocSnapshot();
        if (cancelled || revision !== inspectionRevision.current) return;

        setProfileId(snapshot.profileId);
        setMigrationId(snapshot.migrationId);
        setMigrationStatus(snapshot.migrationStatus);
        setLocalUpdatedAt(snapshot.localUpdatedAt);
        setCloudUpdatedAt(snapshot.cloudUpdatedAt);
        setSteps({
          ...buildStepState(snapshot.completedSteps, snapshot.failedStep),
          reloaded:
            snapshot.hasLocalFixture && (snapshot.hasCloudRecord || snapshot.completedSteps.includes("localPrepared"))
              ? "success"
              : "idle",
        });
      } catch {
        if (cancelled || revision !== inspectionRevision.current) return;
        setSteps((current) => ({ ...current, reloaded: "error" }));
      }
    };

    void inspect();

    return () => {
      cancelled = true;
    };
  }, []);

  const stepItems = useMemo(
    () => [
      { label: "Localデータ準備", status: steps.localPrepared },
      { label: "migrationId生成", status: steps.migrationIdGenerated },
      { label: "DEK生成", status: steps.dekGenerated },
      { label: "Localデータ暗号化", status: steps.encrypted },
      { label: "wrapped DEK生成", status: steps.wrapped },
      { label: "Cloud Mock保存", status: steps.uploaded },
      { label: "ページ再読込後の状態確認", status: steps.reloaded },
      { label: "Cloud Mock再取得", status: steps.fetched },
      { label: "DEK復元", status: steps.unwrapped },
      { label: "payload復号", status: steps.decrypted },
      { label: "Local元データ一致", status: steps.matched },
      { label: "migration verified", status: steps.verified },
    ],
    [steps],
  );

  async function handlePrepareLocal() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);

    try {
      const result = await prepareLocalCloudMigrationPocFixture();
      setSteps({
        ...createStepState(),
        localPrepared: "success",
      });
      setPayloadPreview(formatPayload(result.fixture));
      setProfileId(result.snapshot.profileId);
      setMigrationId(result.snapshot.migrationId);
      setMigrationStatus(result.snapshot.migrationStatus);
      setLocalUpdatedAt(result.snapshot.localUpdatedAt);
      setCloudUpdatedAt(result.snapshot.cloudUpdatedAt);
      setMessage("PoC専用の架空Localデータを準備しました。既存のSHINROMii実利用データには触れていません。");
    } catch (error) {
      setSteps((current) => ({ ...current, localPrepared: "error" }));
      setMessage(error instanceof Error ? error.message : "PoC用のLocalデータ準備に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartMigration() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);

    try {
      const result = await runLocalCloudMigrationPoc();
      setSteps({
        ...buildStepState(result.completedSteps),
        reloaded: "idle",
      });
      setPayloadPreview(formatPayload(result.payload));
      setProfileId(result.snapshot.profileId);
      setMigrationId(result.snapshot.migrationId);
      setMigrationStatus(result.snapshot.migrationStatus);
      setLocalUpdatedAt(result.snapshot.localUpdatedAt);
      setCloudUpdatedAt(result.snapshot.cloudUpdatedAt);
      setMessage("Local→Cloud Migration PoCで、暗号化・Cloud Mock保存・再取得・復号・一致確認まで完了しました。Local元データは残したままです。");
    } catch (error) {
      const nextSteps =
        error instanceof LocalCloudMigrationPocFlowError ? buildStepState(error.completedSteps, error.failedStep) : createStepState();
      setSteps((current) => ({
        ...current,
        ...nextSteps,
      }));
      setMessage(error instanceof Error ? error.message : "Local→Cloud Migration PoCに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyStored() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);

    try {
      const result = await verifyStoredLocalCloudMigrationPoc();
      setSteps((current) => ({
        ...current,
        ...buildStepState(result.completedSteps),
      }));
      setPayloadPreview(formatPayload(result.payload));
      setProfileId(result.snapshot.profileId);
      setMigrationId(result.snapshot.migrationId);
      setMigrationStatus(result.snapshot.migrationStatus);
      setLocalUpdatedAt(result.snapshot.localUpdatedAt);
      setCloudUpdatedAt(result.snapshot.cloudUpdatedAt);
      setMessage("Cloud Mockから再取得した暗号データを復号し、Local元データとの完全一致を再確認しました。");
    } catch (error) {
      if (error instanceof LocalCloudMigrationPocFlowError) {
        setSteps((current) => ({
          ...current,
          ...buildStepState(error.completedSteps, error.failedStep),
        }));
        setMessage(error.message);
      } else {
        setMessage(error instanceof Error ? error.message : "保存済みMigration PoCの再検証に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    inspectionRevision.current += 1;
    setLoading(true);
    setMessage(null);

    try {
      await clearLocalCloudMigrationPocData();
      setSteps(createStepState());
      setPayloadPreview("");
      setProfileId(null);
      setMigrationId(null);
      setMigrationStatus("idle");
      setLocalUpdatedAt(null);
      setCloudUpdatedAt(null);
      setMessage("PoC用のLocalデータ、Migrationメタ情報、鍵、Cloud Mockデータを削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Migration PoCデータの削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-choice">
      <strong>{APP_VERSION_LABEL} Local → Cloud Migration PoC</strong>
      <span>
        PoC専用の架空Localデータを、クライアント側で AES-256-GCM 暗号化し、wrapped DEK と一緒に Cloud Mock
        形式へ保存します。
        <br />
        保存成功だけでは完了にせず、再取得・復号・Local元データ完全一致まで確認して verified にします。
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
        <button type="button" className="action-button" onClick={handlePrepareLocal} disabled={loading}>
          架空のLocalデータを準備
        </button>
        <button type="button" className="action-button subtle" onClick={handleStartMigration} disabled={loading}>
          Migration開始
        </button>
        <button type="button" className="action-button subtle" onClick={() => window.location.reload()} disabled={loading}>
          ページを再読込
        </button>
        <button type="button" className="action-button subtle" onClick={handleVerifyStored} disabled={loading}>
          保存済みMigrationを再検証
        </button>
        <button type="button" className="action-button danger" onClick={handleClear} disabled={loading}>
          PoCデータを削除
        </button>
      </div>
      <div className="admin-crypto-meta">
        <p>Local保存先: IndexedDB `SHINROMII_LOCAL_MIGRATION_POC_LOCAL`</p>
        <p>Cloud Mock保存先: IndexedDB `SHINROMII_LOCAL_MIGRATION_POC_CLOUD`</p>
        <p>migrationId: {migrationId ?? "未生成"}</p>
        <p>migrationStatus: {migrationStatus}</p>
        <p>profileId: {profileId ?? "未作成"}</p>
        <p>Local更新日時: {localUpdatedAt ?? "未保存"}</p>
        <p>Cloud更新日時: {cloudUpdatedAt ?? "未保存"}</p>
      </div>
      {message ? (
        <p className="admin-crypto-message" role="status" aria-live="polite" aria-atomic="true">
          {message}
        </p>
      ) : null}
      {payloadPreview ? (
        <pre className="admin-crypto-preview" aria-label="Local to cloud migration PoC payload preview">
          {payloadPreview}
        </pre>
      ) : null}
    </div>
  );
}
