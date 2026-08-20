import { NextResponse } from "next/server";
import { ADMIN_PREVIEW_ACCESS_COOKIE, ADMIN_PREVIEW_QUERY_PARAM } from "@/lib/admin-paths";
import { createAdminPreviewAccessCookieValue, isValidAdminPreviewKey } from "@/lib/admin-access-server";

function sanitizeRedirectPath(redirectTo: string | null) {
  if (!redirectTo || !redirectTo.startsWith("/admin")) {
    return "/admin";
  }

  return redirectTo;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providedKey = url.searchParams.get(ADMIN_PREVIEW_QUERY_PARAM);
  const redirectTo = sanitizeRedirectPath(url.searchParams.get("redirectTo"));

  if (!isValidAdminPreviewKey(providedKey)) {
    return NextResponse.redirect(new URL("/", url));
  }

  const response = NextResponse.redirect(new URL(redirectTo, url));
  response.cookies.set({
    name: ADMIN_PREVIEW_ACCESS_COOKIE,
    value: createAdminPreviewAccessCookieValue(process.env.SHINROMII_ADMIN_PREVIEW_KEY?.trim() ?? ""),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 30,
  });

  return response;
}
