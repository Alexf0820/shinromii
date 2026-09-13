"use client";

import { useRef, useState } from "react";
import { SHINROMII_SHARE, shareShinromii } from "@/lib/share-shinromii";

export function ShareShinromii() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [message, setMessage] = useState("");

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(SHINROMII_SHARE.url);
      setMessage("URLをコピーしました。");
    } catch {
      setMessage("下のURLを長押し、または選択してコピーしてください。");
    }
  }

  async function share() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await shareShinromii();
      if (result === "copy") setCopyMode(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <section className="share-shinromii-card" aria-label="SHINROMiiを紹介する">
    <button type="button" className="action-button" disabled={busy} onClick={share}>📤 SHINROMiiを知り合いに送る</button>
    {copyMode && <div className="share-shinromii-copy">
      <button type="button" className="action-button" onClick={copyUrl}>URLをコピー</button>
      <input aria-label="共有するURL" readOnly value={SHINROMII_SHARE.url} onFocus={event => event.currentTarget.select()} />
    </div>}
    <p role="status">{message}</p>
  </section>;
}
