import Link from "next/link";
import { buildAdminPath } from "@/lib/admin-paths";

export function AdminPreviewBar() {
  return (
    <div className="admin-preview-bar">
      <p>プレビュー（保存しません）</p>
      <Link href={buildAdminPath("/admin")}>管理ページへ戻る</Link>
    </div>
  );
}
