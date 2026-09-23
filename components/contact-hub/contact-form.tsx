"use client";

import { type FormEvent, useRef, useState } from "react";
import styles from "./contact.module.css";

export function ContactForm({ english = false }: { english?: boolean }) {
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "limited">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (submitting.current || !form.reportValidity()) return;
    submitting.current = true;
    setPending(true);
    setStatus("idle");
    const data = new FormData(form);
    const body = JSON.stringify({
      name: data.get("name"), email: data.get("email"), subject: data.get("subject"),
      message: data.get("message"), honeypot: data.get("website"),
    });
    try {
      if (new TextEncoder().encode(body).byteLength > 16_384) throw new Error("Payload too large");
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 429) { setStatus("limited"); return; }
      if (!response.ok) throw new Error("Unable to send");
      form.reset();
      setStatus("success");
    } catch { setStatus("error"); }
    finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return <>
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={pending}>
      <div className={styles.field}><label htmlFor="contact-name">{english ? "Name" : "お名前"} <span>{english ? "Required" : "必須"}</span></label><input id="contact-name" name="name" autoComplete="name" required maxLength={120} /></div>
      <div className={styles.field}><label htmlFor="contact-email">{english ? "Email" : "メールアドレス"} <span>{english ? "Required" : "必須"}</span></label><input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
      <div className={styles.field}><label htmlFor="contact-subject">{english ? "Subject" : "件名"} <span>{english ? "Required" : "必須"}</span></label><input id="contact-subject" name="subject" required maxLength={200} /></div>
      <div className={styles.field}><label htmlFor="contact-message">{english ? "Message" : "お問い合わせ内容"} <span>{english ? "Required" : "必須"}</span></label><textarea id="contact-message" name="message" required maxLength={10_000} rows={8} /></div>
      <aside className={styles.note} aria-labelledby="reply-note-title">
        <strong id="reply-note-title">{english ? "About inquiries" : "お問い合わせについて"}</strong>
        <p>{english ? "We cannot promise an individual reply. Depending on the content, we may be unable to respond." : "いただいた内容への個別のご返信はお約束しておりません。内容によっては返信できない場合がありますので、あらかじめご了承ください。"}</p>
      </aside>
      <div className={styles.honeypot} aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" maxLength={200} /></div>
      {status === "success" && <div className={styles.feedback} role="status"><p>{english ? "Your inquiry has been sent." : "お問い合わせを送信しました。"}</p><small>{english ? "An individual reply is not guaranteed." : "※個別のご返信をお約束するものではありません。"}</small></div>}
      {status === "error" && <p className={`${styles.feedback} ${styles.error}`} role="alert">{english ? "Unable to send. Please try again later." : "送信できませんでした。時間をおいてもう一度お試しください。"}</p>}
      {status === "limited" && <p className={`${styles.feedback} ${styles.error}`} role="alert">{english ? "Too many messages. Please wait before trying again." : "送信回数が多いため、しばらく時間をおいてからもう一度お試しください。"}</p>}
      <button className={styles.submit} type="submit" disabled={pending}>{pending ? (english ? "Sending..." : "送信中...") : (english ? "Send inquiry" : "お問い合わせを送信する")}</button>
    </form>
  </>;
}
