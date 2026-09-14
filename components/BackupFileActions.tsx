"use client";

import { useEffect, useId, useRef, useState } from "react";
import { UiIcon } from "@/components/UiIcon";
import { buildShinromiiBackup, formatBackupFileName, parseShinromiiBackupJson } from "@/lib/shinromii-backup";
import { canShareBackupFile, downloadBackupFile, shareBackupFile } from "@/lib/backup-delivery";
import { getLocalShinromiiStorageRepository } from "@/lib/shinromii-storage-local-repository";
import { isDemoMode, scopedStorageKey } from "@/lib/shinromii-demo-mode";
import type { ShinromiiStorage } from "@/lib/shinromii-storage";

const repository = getLocalShinromiiStorageRepository();
// 10 MB (10,000,000 bytes). Check before reading or parsing the file.
const MAX_BACKUP_FILE_BYTES = 10_000_000;
const CREATED_KEY = "SHINROMII::ui::backup-file-created::v1";
const displayDate = (value: string) => Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString("ja-JP", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "不明";
type PendingRestore = { name: string; createdAt: string; storage: ShinromiiStorage };

export function BackupFileActions({ restoreOnly = false, preview = false, onRestored }: {
  restoreOnly?: boolean;
  preview?: boolean;
  onRestored?: (storage: ShinromiiStorage) => void | Promise<void>;
}) {
  const [panel, setPanel] = useState<"save" | "restore" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState("");
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  const [share, setShare] = useState(false);
  const [ios, setIos] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    try { setLastCreated(localStorage.getItem(scopedStorageKey(CREATED_KEY))); } catch { /* UI history is optional. */ }
  }, []);
  useEffect(() => { if (panel) dialog.current?.showModal(); }, [panel]);
  function close() { if (!running.current) { dialog.current?.close(); setPanel(null); setPending(null); setFile(null); } }

  async function prepareBackup() {
    if (running.current) return;
    running.current = true; setBusy(true); setMessage("");
    try {
      const current = await repository.loadStorage({ mode: "readonly" });
      const date = new Date();
      const prepared = new File([JSON.stringify(buildShinromiiBackup(current, date.toISOString()), null, 2)], formatBackupFileName(date), { type: "application/json" });
      setFile(prepared);
      // Prefer the share sheet on mobile. Desktop keeps its familiar download flow.
      setShare((ios || /Android/.test(navigator.userAgent)) && canShareBackupFile(prepared));
      setPanel("save");
      setLastCreated(date.toISOString());
      try { localStorage.setItem(scopedStorageKey(CREATED_KEY), date.toISOString()); } catch { /* Never fail a backup because UI history cannot be stored. */ }
    } catch { setMessage("バックアップファイルを作成できませんでした。現在のデータは変更していません。もう一度お試しください。"); }
    finally { running.current = false; setBusy(false); }
  }

  async function deliver(useShare: boolean) {
    if (!file || running.current) return;
    running.current = true; setBusy(true); setMessage("");
    try {
      if (useShare) {
        const result = await shareBackupFile(file);
        setMessage(result === "cancelled" ? "保存先の選択をキャンセルしました。必要ならもう一度保存してください。" : "共有画面を閉じました。「ファイル」で保存先とファイル名をご確認ください。保存完了はSHINROMiiから確認できません。");
      } else {
        downloadBackupFile(file);
        setMessage("バックアップファイルを作成し、ブラウザに渡しました。保存先をご確認ください。保存完了はSHINROMiiから確認できません。");
      }
    } catch { setMessage("保存先の画面を開けませんでした。「通常のダウンロードで保存」をお試しください。現在のデータは変更していません。"); }
    finally { running.current = false; setBusy(false); }
  }

  async function readBackup(selected?: File) {
    if (!selected || running.current) return;
    running.current = true; setBusy(true); setMessage("");
    try {
      if (selected.size > MAX_BACKUP_FILE_BYTES) {
        setMessage("このバックアップファイルは大きすぎるため読み込めません。SHINROMiiから作成した正しいバックアップファイルか確認してください。");
        return;
      }
      const parsed = parseShinromiiBackupJson(await selected.text());
      if (!parsed.ok) { setMessage(parsed.error); return; }
      setPending({ name: selected.name, createdAt: parsed.backup.createdAt, storage: parsed.storage });
      setPanel("restore");
    } catch { setMessage("ファイルを読み込めませんでした。現在のデータは変更していません。"); }
    finally { running.current = false; setBusy(false); }
  }

  async function restore() {
    if (!pending || running.current || preview) return;
    running.current = true; setBusy(true);
    try {
      await repository.saveStorage(pending.storage);
    } catch {
      setMessage("復元を保存できませんでした。空き容量などを確認して、もう一度お試しください。");
      running.current = false; setBusy(false); return;
    }
    const restored = pending.storage;
    running.current = false; setBusy(false); close();
    setMessage("バックアップから復元しました。");
    try { await onRestored?.(restored); } catch { setMessage("復元しました。画面を再読み込みしてご確認ください。"); }
  }

  return <div className="backup-file-actions">
    <div className="action-row">
      {!restoreOnly && <button type="button" className="action-button primary" disabled={busy} onClick={() => void prepareBackup()}><UiIcon name="download" className="action-icon" />バックアップを保存</button>}
      <button type="button" className="action-button" disabled={busy || preview} onClick={() => { setMessage(""); input.current?.click(); }}><UiIcon name="upload" className="action-icon" />バックアップから復元</button>
    </div>
    <input ref={input} type="file" accept="application/json,.json" hidden onChange={event => { void readBackup(event.target.files?.[0]); event.target.value = ""; }} />
    {!restoreOnly && lastCreated && <p className="backup-small">最終ファイル作成：{displayDate(lastCreated)}{isDemoMode() ? "（デモ）" : ""}<br />保存完了の記録ではありません。保存先にファイルがあるかご確認ください。</p>}
    {message && !panel && <p role="status" className="info-strip">{message}</p>}
    {panel && <dialog ref={dialog} className="grade-reference-dialog backup-dialog" aria-labelledby={titleId} onCancel={event => { if (running.current) event.preventDefault(); }} onClose={() => { setPanel(null); setFile(null); setPending(null); }}>
      <h2 id={titleId}>{panel === "save" ? "バックアップを保存します" : "バックアップから復元"}</h2>
      {panel === "save" && file ? <>
        <p>バックアップファイルを作成しました。{isDemoMode() ? "デモのデータだけが入っています。" : ""}</p>
        {share ? <p>次の画面で「“ファイル”に保存」を選んでください。</p> : ios ? <p>次の画面で「ダウンロード」を選んでください。内容が表示された場合は「共有」→「“ファイル”に保存」を選びます。</p> : <p>次のボタンで保存します。保存先は通常「ダウンロード」フォルダです。</p>}
        <p className="backup-small">iCloud Driveに保存しておくと、機種変更時にも使えます。</p>
        <p className="backup-filename">{file.name}</p>
        <p className="backup-small">添付ファイルは別に保管してください。SHINROMiiからサーバーへの送信は行いません。</p>
        <button type="button" className="action-button primary" disabled={busy} onClick={() => void deliver(share)}>{busy ? "保存画面を開いています…" : "バックアップを保存する"}</button>
        {share && <button type="button" className="action-button" disabled={busy} onClick={() => void deliver(false)}>通常のダウンロードで保存</button>}
      </> : pending ? <>
        <p className="backup-filename">{pending.name}</p>
        <p>作成日時：{displayDate(pending.createdAt)}</p>
        <p>{pending.storage.meta?.isSample ? "サンプルのバックアップ" : "通常のバックアップ"}</p>
        <ul><li>成績：{pending.storage.gradeRecords.length}件</li><li>資格・検定：{pending.storage.qualifications.length}件</li><li>大学候補：{pending.storage.universityCandidates.length}件</li><li>OC：{pending.storage.openCampusEvents.length}件</li><li>相談メモ：{pending.storage.aiNotes.length}件</li></ul>
        <p className="backup-warning">{isDemoMode() ? "現在のデモデータ" : "現在のデータ"}を、このバックアップの内容で置き換えます。追加・結合ではありません。今の内容を残す場合は、キャンセルして先にバックアップを保存してください。</p>
        <button type="button" className="action-button primary" disabled={busy || preview} onClick={() => void restore()}>{busy ? "復元中…" : "復元する"}</button>
      </> : null}
      {message && <p role="status" className="info-strip">{message}</p>}
      <button type="button" className="action-button" disabled={busy} onClick={close}>{panel === "restore" ? "キャンセル" : "閉じる"}</button>
    </dialog>}
  </div>;
}
