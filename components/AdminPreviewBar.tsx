import Link from "next/link";

export function AdminPreviewBar() {
  return (
    <div className="admin-preview-bar">
      <p>プレビュー（保存しません）</p>
      <Link href="/admin">管理ページへ戻る</Link>
    </div>
  );
}
