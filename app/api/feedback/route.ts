// Old clients must fail closed; never retain a second, instance-local mail relay.
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ available: false, contactPath: "/contact" }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST() {
  return Response.json({ ok: false, message: "お問い合わせフォームをご利用ください。", contactPath: "/contact" }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
