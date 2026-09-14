"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/components/UiIcon";
import { BackupFileActions } from "@/components/BackupFileActions";
import {
  formatAutosaveDateTime,
  type AutosaveHistoryEntry,
} from "@/lib/shinromii-autosave";
import { getLocalShinromiiStorageRepository } from "@/lib/shinromii-storage-local-repository";
import { parseBackupStorageData } from "@/lib/shinromii-storage";

const storageRepository = getLocalShinromiiStorageRepository();

export function BackupDataManagementClient() {
  const [autosaveHistory, setAutosaveHistory] = useState<AutosaveHistoryEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const history = await storageRepository.loadAutosaveHistory();

      if (!cancelled) {
        setAutosaveHistory(history);
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshHistory() {
    setAutosaveHistory(await storageRepository.loadAutosaveHistory());
  }

  async function handleAutosaveRestore(entry: AutosaveHistoryEntry) {
    const label = formatAutosaveDateTime(entry.savedAt);
    const confirmed = window.confirm(
      `${label} の状態に戻しますか？\n現在のデータは置き換わります。`,
    );

    if (!confirmed) {
      setMessage("自動保存の履歴からの復元をキャンセルしました。");
      return;
    }

    const restored = parseBackupStorageData(entry.data);

    if (!restored) {
      const nextMessage = "この履歴は読み込めなかったため、現在のデータはそのままです。";
      window.alert(nextMessage);
      setMessage(nextMessage);
      return;
    }

    await storageRepository.saveStorage(restored);
    await refreshHistory();
    setMessage("自動保存の履歴から復元しました。");
  }


  return (
    <div className="page-stack compact settings-stack">
      <section className="panel settings-status-card">
        <div className="settings-status-icon" aria-hidden="true">
          <UiIcon name="lock" className="settings-status-glyph" />
        </div>
        <div>
          <p className="settings-status-label">今の状態</p>
          <p className="settings-status-title">この端末にデータが保存されています</p>
          <p className="settings-status-text">
            無料版では、入力した進路情報をこの端末の中に保存して使います。
          </p>
        </div>
      </section>

      <section className="panel settings-card-block settings-block-prominent">
        <p className="settings-mini-label">自動で戻せる最近の状態</p>
        <p className="settings-card-title">最近の保存状態を1件だけ残しています</p>
        <p className="settings-copy">
          間違えて消してしまったときのために、最近の状態を1件だけこの端末に残します。
        </p>
        {autosaveHistory.length === 0 ? (
          <p className="settings-copy">まだ履歴はありません。データを保存すると、ここに表示されます。</p>
        ) : (
          <div className="autosave-list">
            {autosaveHistory.map((entry) => (
              <div key={entry.id} className="autosave-row">
                <div className="autosave-row-copy">
                  <p className="autosave-row-time">
                    {formatAutosaveDateTime(entry.savedAt)}
                    <span className="term-latest-badge">最新</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="action-button autosave-restore-button"
                  onClick={() => handleAutosaveRestore(entry)}
                >
                  この状態に戻す
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel settings-card-block">
        <p className="settings-card-title">バックアップと復元</p>
        <p className="settings-copy">進路データの控えをファイルに保存できます。復元前に内容を確認します。添付ファイル本体は含まれません。</p>
        <BackupFileActions onRestored={refreshHistory} />
      </section>

      <div className="settings-soft-note">
        <p>
          定期的にバックアップをとっておくと、機種変更や家族との受け渡しのときにも安心です。
        </p>
      </div>

      {message ? (
        <div className="info-strip" role="status" aria-live="polite" aria-atomic="true">
          <p className="settings-mini-label">データの状況</p>
          <p>{message}</p>
        </div>
      ) : null}
    </div>
  );
}
