"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { AdminCryptoPocPanel } from "@/components/admin/AdminCryptoPocPanel";
import { AdminDekWrapPocPanel } from "@/components/admin/AdminDekWrapPocPanel";
import { AdminFamilyKeySharingPocPanel } from "@/components/admin/AdminFamilyKeySharingPocPanel";
import {
  loadShinromiiStorage,
  signInForLocalPreview,
  signOutForLocalPreview,
  type ShinromiiStorage,
} from "@/lib/shinromii-storage";

function createFallback(): ShinromiiStorage | null {
  return null;
}

export function AdminClient() {
  const [storage, setStorage] = useState<ShinromiiStorage | null>(createFallback);

  useEffect(() => {
    setStorage(loadShinromiiStorage());
  }, []);

  const currentUser = storage?.identity.users.find((user) => user.id === storage.identity.session.currentUserId) ?? null;
  const currentStudent =
    storage?.identity.studentProfiles.find((student) => student.id === storage.identity.session.currentStudentProfileId) ??
    null;

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

      <section className="admin-section">
        <h2 className="admin-section-title">認証基盤プレビュー</h2>
        <div className="admin-choice">
          <strong>{storage?.identity.session.status === "signed_in" ? "ログイン状態" : "未ログイン状態"}</strong>
          <span>
            user_id: {storage?.identity.session.currentUserId ?? "-"}
            <br />
            auth_user_id: {currentUser?.authUserId ?? "(未接続)"}
            <br />
            plan: {currentUser?.plan ?? "free"}
            <br />
            family_id: {storage?.identity.session.currentFamilyId ?? "-"}
            <br />
            student_profile_id: {storage?.identity.session.currentStudentProfileId ?? "-"}
            <br />
            display_name: {currentStudent?.displayName || "(未設定)"}
          </span>
          <div className="admin-auth-actions">
            <button
              type="button"
              className="action-button"
              onClick={() => {
                signInForLocalPreview("magic_link");
                setStorage(loadShinromiiStorage());
              }}
            >
              ローカルでログイン状態にする
            </button>
            <button
              type="button"
              className="action-button subtle"
              onClick={() => {
                signOutForLocalPreview();
                setStorage(loadShinromiiStorage());
              }}
            >
              ログアウト状態に戻す
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">暗号化PoC</h2>
        <div className="admin-poc-stack">
          <AdminCryptoPocPanel />
          <AdminDekWrapPocPanel />
          <AdminFamilyKeySharingPocPanel />
        </div>
      </section>
    </div>
  );
}
