import { redirect } from "next/navigation";
import { sanitizeAdminRedirect } from "@/lib/admin-paths";
export const dynamic = "force-dynamic";
export default async function AdminAccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  // Retired key-in-query links never authenticate and never echo the key into HTML/links.
  if (params.adminKey !== undefined) redirect("/admin/access");
  return <section className="panel settings-card-block">
    <h1>管理プレビュー</h1>
    <p>管理キーを入力してください。有効期限は30分です。</p>
    {params.error && <p role="alert">管理キーを確認して、もう一度お試しください。</p>}
    <form action="/admin/access/session" method="post">
      <input type="hidden" name="redirectTo" value={sanitizeAdminRedirect(params.redirectTo)} />
      <label htmlFor="admin-preview-key">管理キー</label>
      <input id="admin-preview-key" name="key" type="password" required maxLength={1024} autoComplete="off" />
      <button type="submit" className="action-button">管理プレビューを開く</button>
    </form>
  </section>;
}
