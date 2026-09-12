import { APP_VERSION, IS_BETA } from "@/lib/app-version";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function feedbackConfigured() {
  return IS_BETA && [process.env.RESEND_API_KEY, process.env.SHINROMII_FEEDBACK_FROM, process.env.SHINROMII_FEEDBACK_TO].every(value => Boolean(value?.trim()));
}

// Only availability crosses the server boundary, never configuration values.
export async function GET() {
  return Response.json({ available: feedbackConfigured() }, { headers: { "Cache-Control": "no-store" } });
}

const attempts = new Map<string, number>();
const reply = (status: number) => Response.json({ ok: status === 200 }, { status });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.headers.get("host") || !/^https?:$/.test(new URL(origin).protocol)) return reply(403);
  } catch { return reply(403); }
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415);
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 12000) { await reader.cancel(); return reply(413); }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return reply(400); }
  if (!input || typeof input !== "object") return reply(400);
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(key => !["message", "id", "createdAt"].includes(key))) return reply(400);
  if (typeof data.message !== "string" || !data.message.trim() || data.message.length > 2000 ||
      typeof data.id !== "string" || !/^[a-f0-9-]{36}$/.test(data.id)) return reply(400);
  if (typeof data.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.createdAt) || !Number.isFinite(Date.parse(data.createdAt))) return reply(400);
  const key = process.env.RESEND_API_KEY;
  const from = process.env.SHINROMII_FEEDBACK_FROM;
  const to = process.env.SHINROMII_FEEDBACK_TO;
  if (!feedbackConfigured()) return reply(503);
  // Short lived, one-way keys only; never include IP addresses in email or logs.
  const now = Date.now();
  for (const [id, expires] of attempts) if (expires <= now) attempts.delete(id);
  const client = createHash("sha256").update(request.headers.get("x-forwarded-for") || "unknown").digest("hex");
  if (attempts.has(client) || attempts.size >= 10000) return reply(429);
  attempts.set(client, now + 10000);
  const ua = request.headers.get("user-agent") || "";
  const device = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows|Macintosh|Linux/.test(ua) ? "PC" : "その他";
  const browser = /Edg/.test(ua) ? "Edge" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "その他";
  // Stable submission time makes retries byte-identical for provider idempotency.
  const text = [`SHINROMii Ver.${APP_VERSION}`, `送信日時: ${data.createdAt}（端末時刻・UTC）`, `現在ページ: /`, `端末種別: ${device}`, `ブラウザ種別: ${browser}`, "", data.message.trim()].join("\n");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `feedback-${data.id}` },
      body: JSON.stringify({ from, to: [to], subject: `SHINROMii Ver.${APP_VERSION} ご意見・ご要望`, text }),
      signal: AbortSignal.timeout(15000),
    });
    return reply(response.ok ? 200 : 502);
  } catch { return reply(502); }
}
