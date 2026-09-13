"use client";

import { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { switchDemoMode } from "@/lib/shinromii-demo-mode";

// UI preference only: never part of the notebook or its backup.
const WELCOME_KEY = "SHINROMII::ui::welcomeVersion";
const WELCOME_VERSION = 1;
const OPEN_EVENT = "shinromii:open-welcome";

export function ReopenWelcome({ label = "はじめての方へ" }: { label?: string }) {
  return <button type="button" className="action-button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>{label}</button>;
}

export function WelcomeGuide({ allowAutomatic = false }: { allowAutomatic?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const dismissed = useRef(false);
  const manual = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const show = () => { manual.current = true; setError(""); setOpen(true); };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);
  useLayoutEffect(() => {
    if (!allowAutomatic || pathname !== "/" || dismissed.current) return;
    let seen = 0;
    try { seen = Number(window.localStorage.getItem(WELCOME_KEY) || 0); } catch { /* Keep welcome usable without storage. */ }
    if (!Number.isFinite(seen) || seen < WELCOME_VERSION) { manual.current = false; setOpen(true); }
  }, [allowAutomatic, pathname]);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (open && element?.isConnected && !element.open) element.showModal();
  }, [open]);

  function dismiss() {
    dismissed.current = true;
    if (!manual.current) {
      try { window.localStorage.setItem(WELCOME_KEY, String(WELCOME_VERSION)); } catch { /* Session remains usable. */ }
    }
    setOpen(false);
  }

  if (!open) return null;
  return <dialog ref={dialog} className="grade-reference-dialog welcome-guide" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); dismiss(); }} onClose={dismiss}>
    <h2 id={titleId}>SHINROMii ベータ版へようこそ！</h2>
    <p>SHINROMiiは、高校・大学選びの情報や、成績・資格、オープンキャンパス、相談したことなどをひとつにまとめておける進路ノートです。</p>
    <p>もしよかったら、ちょっといじってみてください。<br />自分にとって便利そうだったら、ぜひ試してみてくださいね 😊</p>
    <p>特に必要なさそうだったら、この話はそのままスルーしてもらって大丈夫です 👍</p>
    <p>気になったら、まず「デモを見てみる」を押してみてください。<br />架空のデータが入ったSHINROMiiを実際に触って見ることができます。</p>
    <p className="welcome-guide-note">（あれっくすより）</p>
    <div className="welcome-guide-actions">
      <button type="button" className="welcome-guide-primary" autoFocus onClick={() => {
        dismiss();
        try { switchDemoMode(true); } catch { setError("デモを開けませんでした。端末の保存設定をご確認ください。"); setOpen(true); }
      }}>🎓 デモを見てみる</button>
      <button type="button" onClick={() => { dismiss(); router.push("/guide"); }}>📖 使い方を見る</button>
      <button type="button" onClick={dismiss}>とりあえず閉じる</button>
    </div>
    <aside className="welcome-install">
      <strong>📱 アプリみたいに使えます</strong>
      <p>SHINROMiiはホーム画面に追加できます。</p>
      <button type="button" onClick={() => { dismiss(); router.push("/guide#home-screen"); }}>追加方法を見る</button>
    </aside>
    {error && <p role="alert">{error}</p>}
    <p className="welcome-guide-note">使ってみて気づいたことがあれば、ぜひ教えてください。</p>
  </dialog>;
}
