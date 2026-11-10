import { NextResponse } from "next/server";
import { ADMIN_PREVIEW_ACCESS_COOKIE, sanitizeAdminRedirect } from "@/lib/admin-paths";
import { createAdminPreviewAccessCookieValue, isValidAdminPreviewKey } from "@/lib/admin-access-server";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  let url: URL;
  try {
    url = new URL(origin ?? "");
    // Next may use its internal hostname in request.url. Host is the incoming deployment host.
    if (url.origin !== origin || url.host !== (request.headers.get("host") ?? requestUrl.host)
      || url.protocol !== requestUrl.protocol || !["https:", "http:"].includes(url.protocol)) {
      return new Response(null, { status: 403 });
    }
  } catch { return new Response(null, { status: 403 }); }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/x-www-form-urlencoded") return new Response(null, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
  } catch { return new Response(null, { status: 400 }); }
  finally { reader.releaseLock(); }
  const params = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  const key = params.get("key");
  if (params.getAll("key").length !== 1 || !key || key.length > 1024 || !isValidAdminPreviewKey(key)) {
    return NextResponse.redirect(new URL("/admin/access?error=1", url), 303);
  }
  const response = NextResponse.redirect(new URL(sanitizeAdminRedirect(params.get("redirectTo")), url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set({
    name: ADMIN_PREVIEW_ACCESS_COOKIE,
    value: createAdminPreviewAccessCookieValue(process.env.SHINROMII_ADMIN_PREVIEW_KEY?.trim() ?? ""),
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/admin", maxAge: 60 * 30,
  });
  return response;
}
