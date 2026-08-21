"use client";

import { usePwaUpdate } from "@/components/PwaRegistration";

export function PwaUpdateNotice() {
  const { applyUpdate, dismissUpdateNotice, errorMessage, showUpdateNotice, status } = usePwaUpdate();

  if (!showUpdateNotice || status === "latest" || status === "unsupported") {
    return null;
  }

  const isError = status === "error";
  const title = isError ? "更新できませんでした" : "新しいバージョンがあります";
  const body = isError && errorMessage ? errorMessage : "最新版に更新できます。";

  return (
    <div className="pwa-update-notice" role="status" aria-live="polite" aria-atomic="true">
      <div className="pwa-update-copy">
        <p className="pwa-update-title">{title}</p>
        <p className="pwa-update-text">{body}</p>
      </div>
      <div className="pwa-update-actions">
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
        <button type="button" className="action-button subtle" onClick={dismissUpdateNotice}>
          あとで
        </button>
      </div>
    </div>
  );
}
