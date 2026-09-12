"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IS_BETA } from "@/lib/app-version";

export function BetaFeedback() {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);
  const attempt = useRef<{ message: string; id: string; createdAt: string } | null>(null);
  const titleId = useId();
  const fieldId = useId();
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  useEffect(() => {
    if (!IS_BETA) return;
    const controller = new AbortController();
    fetch("/api/feedback", { cache: "no-store", credentials: "omit", signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!controller.signal.aborted) setAvailable(result?.available === true); })
      .catch(() => { /* Unavailable or offline: keep the entry hidden. */ });
    return () => controller.abort();
  }, []);
  if (!IS_BETA || !available) return null;
  return <>
    <section className="beta-feedback-card">
      <h2>💬 ベータ版へのご意見を募集中！</h2>
      <p>「ここが分かりにくい」「こんな機能が欲しい」など、ちょっとしたことでもぜひ教えてください。</p>
      <button type="button" className="action-button" onClick={() => { setOpen(true); if (state === "success") { setMessage(""); setState("idle"); attempt.current = null; } }}>ご意見・ご要望を送る</button>
    </section>
    {open && createPortal(<dialog ref={dialog} className="grade-reference-dialog beta-feedback-dialog" aria-labelledby={titleId} onClose={() => setOpen(false)} onCancel={event => { if (sending.current) event.preventDefault(); }}>
      <h2 id={titleId}>ご意見・ご要望</h2>
      {state === "success" ? <p role="status">ありがとうございます！<br />ご意見は今後のSHINROMii改善の参考にします。</p> : <form onSubmit={async event => {
        event.preventDefault();
        if (sending.current || !message.trim() || message.length > 2000) return;
        sending.current = true;
        setState("sending");
        if (attempt.current?.message !== message) attempt.current = { message, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        try {
          const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit", body: JSON.stringify(attempt.current), signal: AbortSignal.timeout(20000) });
          if (!response.ok) throw new Error("send failed");
          setState("success");
        } catch { setState("error"); } finally { sending.current = false; }
      }}>
        <p>SHINROMiiを使って気づいたことを自由にお書きください。</p>
        <label htmlFor={fieldId}>本文（必須・2,000文字以内）</label>
        <textarea id={fieldId} required maxLength={2000} rows={6} value={message} disabled={state === "sending"} onChange={event => setMessage(event.target.value)} />
        <p className="beta-feedback-hint">氏名・学校名などの個人情報は記入しないでください。保存された成績やメモ等は送信しません。</p>
        <p className="beta-feedback-hint">※返信用のお問い合わせフォームではありません。</p>
        {state === "error" && <p role="alert">送信できませんでした。本文を残しています。少し時間をおいて再度お試しください。</p>}
        <button type="submit" disabled={state === "sending" || !message.trim()}>{state === "sending" ? "送信中…" : "送信する"}</button>
      </form>}
      <button type="button" disabled={state === "sending"} onClick={() => dialog.current?.close()}>閉じる</button>
    </dialog>, document.body)}
  </>;
}
