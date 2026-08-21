"use client";

import { usePwaUpdate } from "@/components/PwaRegistration";

export function AppUpdateSettingsClient() {
  const {
    applyUpdate,
    checkForUpdate,
    currentVersionLabel,
    errorMessage,
    isStandalone,
    isSupported,
    status,
  } = usePwaUpdate();

  const hasUpdate = status === "available" || status === "updating";
  const isBusy = status === "checking" || status === "updating";

  let statusMessage: string | null = null;

  if (!isSupported) {
    statusMessage = "この環境では、ページを再読み込みすると最新版になります。";
  } else if (status === "checking") {
    statusMessage = "更新を確認しています。";
  } else if (status === "latest") {
    statusMessage = "最新のバージョンです。";
  } else if (hasUpdate) {
    statusMessage = "新しいバージョンがあります。";
  } else if (status === "error" && errorMessage) {
    statusMessage = errorMessage;
  } else if (!isStandalone) {
    statusMessage = "ホーム画面に追加していない場合は、ページを再読み込みすると最新版になります。";
  }

  return (
    <div className="page-stack compact settings-stack">
      <section className="panel settings-status-card">
        <div className="settings-status-icon" aria-hidden="true">
          <span className="settings-version-badge">{currentVersionLabel}</span>
        </div>
        <div>
          <p className="settings-status-label">現在のバージョン</p>
          <p className="settings-status-title">{currentVersionLabel}</p>
          <p className="settings-status-text">この端末で使っている SHINROMii の現在のバージョンです。</p>
        </div>
      </section>

      <section className="panel settings-card-block">
        <p className="settings-mini-label">更新の確認</p>
        <p className="settings-card-title">新しいバージョンを確認する</p>
        <p className="settings-copy">
          {isSupported
            ? "更新があるときだけ、ここから最新版へ切り替えられます。"
            : "この環境では、ページを再読み込みすると最新版を読み込めます。"}
        </p>
        <div className="action-row">
          <button
            type="button"
            className="action-button"
            onClick={() => {
              void checkForUpdate();
            }}
            disabled={isBusy || !isSupported}
          >
            {status === "checking" ? "確認中…" : "更新を確認"}
          </button>
          {hasUpdate ? (
            <button
              type="button"
              className="action-button primary"
              onClick={() => {
                void applyUpdate();
              }}
              disabled={status === "updating"}
            >
              {status === "updating" ? "更新中…" : "今すぐ更新"}
            </button>
          ) : null}
        </div>
      </section>

      {statusMessage ? (
        <div className="info-strip" role="status" aria-live="polite" aria-atomic="true">
          <p className="settings-mini-label">更新の状態</p>
          <p>{statusMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
