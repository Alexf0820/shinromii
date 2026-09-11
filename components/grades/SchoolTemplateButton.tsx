"use client";

import { useRef, useState } from "react";
import { isDemoMode } from "@/lib/shinromii-demo-mode";
import { applySchoolSubjectsTemplate, inspectSchoolTemplateTarget } from "@/lib/shinromii-storage";

export function SchoolTemplateButton({ onApplied }: { onApplied: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [warning, setWarning] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [status, setStatus] = useState("");

  function open() {
    setStatus("");
    try {
      const target = inspectSchoolTemplateTarget();
      setBlocked(target.hasGrades);
      setWarning(target.hasGrades
        ? "成績が登録されているため適用できません。"
        : target.replacing ? "現在の科目設定を14科目で置き換えます。" : "14科目の設定を新しく登録します。");
    } catch (error) {
      setBlocked(true);
      setWarning(error instanceof Error ? error.message : "保存状態を確認できません。");
    }
    dialog.current?.showModal();
  }

  function apply() {
    try {
      applySchoolSubjectsTemplate("sample-high1-v1");
      onApplied();
      setStatus("高校1年・14科目の設定を保存しました。");
      dialog.current?.close();
    } catch (error) {
      setBlocked(true);
      setWarning(error instanceof Error ? error.message : "保存できませんでした。");
    }
  }

  if (isDemoMode()) return null;
  return <div>
    <button type="button" className="secondary-button" style={{ padding: "4px 10px", fontSize: "12px" }} onClick={open} aria-label="BG 科目設定">BG</button>
    {status && <p role="status">{status}</p>}
    <dialog ref={dialog} aria-labelledby="bg-template-title" style={{ maxWidth: "min(420px, calc(100vw - 32px))", border: "1px solid #dbe2ea", borderRadius: "16px", padding: "24px" }}>
      <h2 id="bg-template-title" style={{ fontSize: "18px" }}>高校1年・14科目の設定を使いますか？</h2>
      <p role={blocked ? "alert" : undefined}>{warning}</p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button type="button" className="primary-button" disabled={blocked} onClick={apply}>使う</button>
        <button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>キャンセル</button>
      </div>
    </dialog>
  </div>;
}
