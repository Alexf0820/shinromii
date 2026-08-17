"use client";

import Link from "next/link";
import { APP_VERSION_LABEL } from "@/lib/app-version";

export function AdminClient() {
  return (
    <div className="admin-page">
      <section className="admin-hero">
        <p className="admin-kicker">SHINROMii 管理・確認</p>
        <p className="admin-lead">
          一般の画面には出しません。保存中の進路データは、ここからのプレビューでは変更しません。
        </p>
        <p className="admin-version">{APP_VERSION_LABEL}</p>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">画面プレビュー</h2>
        <div className="admin-actions">
          <Link href="/admin/preview/welcome" className="admin-choice">
            <strong>初回案内画面を見る</strong>
            <span>新規ユーザー向けの案内を、実データはそのまま確認します</span>
          </Link>
          <Link href="/admin/preview/setup" className="admin-choice">
            <strong>初回セットアップ画面を見る</strong>
            <span>入力しても保存されません</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
