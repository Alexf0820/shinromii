import { createHash, createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 16_384;
const hasMarkup = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);
const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max && !hasMarkup(value) ? value.trim() : null;

function failure(status: number) {
  return NextResponse.json({ error: status === 429 ? "Please try again later" : "Unable to send inquiry" },
    { status, headers: { "Cache-Control": "no-store" } });
}

function parsePayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const name = text(data.name, 120);
  const email = text(data.email, 254);
  const subject = text(data.subject, 200);
  const message = text(data.message, 10_000);
  const honeypot = data.honeypot ?? "";
  const turnstileToken = data.turnstileToken ?? "";
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !subject || !message ||
      typeof honeypot !== "string" || honeypot.length > 200 ||
      typeof turnstileToken !== "string" || turnstileToken.length > 4096) return null;
  return { name, email, subject, message, honeypot, turnstileToken };
}

export async function POST(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return failure(422);
  const reader = request.body?.getReader();
  if (!reader) return failure(422);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) { await reader.cancel(); return failure(422); }
      chunks.push(value);
    }
  } catch { return failure(422); }
  finally { reader.releaseLock(); }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return failure(422); }
  const payload = parsePayload(value);
  if (!payload) return failure(422);
  const hubUrl = process.env.CONTACT_HUB_URL;
  const secret = process.env.CONTACT_HUB_SHINROMII_SECRET;
  if (!hubUrl || !secret) return failure(503);
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const hash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", secret).update(`${timestamp}.${hash}`).digest("hex");
  const headers: Record<string, string> = {
    "content-type": "application/json", "x-contact-site": "shinromii",
    "x-contact-timestamp": timestamp, "x-contact-signature": signature,
  };
  // Deployment protection bypass is never used for Production traffic.
  if (process.env.VERCEL_ENV !== "production" && process.env.CONTACT_HUB_VERCEL_PROTECTION_BYPASS) {
    headers["x-vercel-protection-bypass"] = process.env.CONTACT_HUB_VERCEL_PROTECTION_BYPASS;
  }
  try {
    const response = await fetch(`${hubUrl.replace(/\/$/, "")}/api/v1/inquiries`, {
      method: "POST", headers, body, cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    try {
      if (response.status === 429) return failure(429);
      if (!response.ok) return failure(502);
    } finally {
      // The public API does not expose upstream bodies; release their resources.
      await response.body?.cancel().catch(() => undefined);
    }
  } catch { return failure(502); }
  return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
