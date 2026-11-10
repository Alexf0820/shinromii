import { NextResponse, type NextRequest } from "next/server";

// Strip retired URL credentials before rendering/Flight serialization, including legacy bookmarks.
// This is not the auth guard: every admin page still verifies its signed cookie server-side.
export function proxy(request: NextRequest) {
  if (!request.nextUrl.searchParams.has("adminKey")) return NextResponse.next();
  const clean = request.nextUrl.clone();
  clean.search = "";
  const response = NextResponse.redirect(clean, 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export const config = { matcher: "/admin/:path*" };
