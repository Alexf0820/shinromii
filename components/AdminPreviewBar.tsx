import Link from "next/link";
import { buildAdminPath } from "@/lib/admin-paths";

type AdminPreviewBarProps = {
  adminKey?: string | null;
};

export function AdminPreviewBar({ adminKey = null }: AdminPreviewBarProps) {
  return (
    <div className="admin-preview-bar">
      <p>プレビュー（保存しません）</p>
      <Link href={buildAdminPath("/admin", adminKey)}>管理ページへ戻る</Link>
    </div>
  );
}
