import { isIP } from "node:net";
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
  if (hubUrl !== "https://contact-hub-sandy.vercel.app" || !secret) return failure(503);
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const hash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", secret).update(`${timestamp}.${hash}`).digest("hex");
  const headers: Record<string, string> = {
    "content-type": "application/json", "x-contact-site": "shinromii",
    "x-contact-timestamp": timestamp, "x-contact-signature": signature,
  };
  Object.assign(headers, visitorProof(request, secret, timestamp, body, headers["x-contact-site"]));
  // Deployment protection bypass is never used for Production traffic.
  if (process.env.VERCEL_ENV !== "production" && process.env.CONTACT_HUB_VERCEL_PROTECTION_BYPASS) {
    headers["x-vercel-protection-bypass"] = process.env.CONTACT_HUB_VERCEL_PROTECTION_BYPASS;
  }
  try {
    const response = await fetch(`${hubUrl.replace(/\/$/, "")}/api/v1/inquiries`, {
      method: "POST", redirect: "error", headers, body, cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    try {
      if (response.status === 429) return failure(429);
      if (!(await acceptedHubResponse(response, Boolean(payload.honeypot)))) return failure(502);
    } finally {
      // The public API does not expose upstream bodies; release their resources.
      await response.body?.cancel().catch(() => undefined);
    }
  } catch { return failure(502); }
  return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}


// Trust only the visitor address supplied by Vercel; never forward raw IPs or client identities.
function visitorProof(request: Request, secret: string, timestamp: string, body: string, site: string): Record<string, string> {
  const ip = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (!ip || !isIP(ip)) return {};
  const fingerprint = createHmac("sha256", secret).update(`contact-visitor:${ip}`).digest("hex");
  const digest = createHash("sha256").update(body).digest("hex");
  const proof = createHmac("sha256", secret).update(`visitor:${site}:${timestamp}:${digest}:${fingerprint}`).digest("hex");
  return { "x-contact-visitor": fingerprint, "x-contact-visitor-proof": proof };
}
async function acceptedHubResponse(response: Response, allowDecoy = false) {
  if ((response.status !== 201 && !(allowDecoy && response.status === 202)) ||
      response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return false;
  const reader = response.body?.getReader();
  if (!reader) return false;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2048) { await reader.cancel(); return false; }
      chunks.push(value);
    }
    const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return result?.ok === true && ((allowDecoy && response.status === 202) ||
      (typeof result.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.id)));
  } catch { return false; }
  finally { reader.releaseLock(); }
}
