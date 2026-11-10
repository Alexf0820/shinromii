import Link from "next/link";
import { IS_BETA } from "@/lib/app-version";

export function BetaFeedback() {
  if (!IS_BETA) return null;
  return (
    <section className="beta-feedback-card">
      <h2>💬 ベータ版へのご意見を募集中！</h2>
      <p>「ここが分かりにくい」「こんな機能が欲しい」など、お問い合わせフォームからお知らせください。</p>
      <Link className="action-button" href="/contact">ご意見・ご要望を送る</Link>
      <p className="beta-feedback-hint">返信先メールアドレスの入力が必要です。端末に保存された成績やメモ等は送信しません。</p>
    </section>
  );
}
