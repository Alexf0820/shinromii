"use client";

import { useState } from "react";
import { ProfileFields } from "@/components/ProfileFields";
import { markSetupFinished } from "@/lib/shinromii-storage";
import { createEmptyProfile, normalizeUserProfile, type UserProfile } from "@/lib/user-profile";

type FirstSetupProps = {
  onFinished: () => void;
  /** 管理プレビュー。保存しない。 */
  preview?: boolean;
};

export function FirstSetup({ onFinished, preview = false }: FirstSetupProps) {
  const [profile, setProfile] = useState<UserProfile>(createEmptyProfile);

  function finish(next: UserProfile) {
    if (!preview) {
      markSetupFinished(normalizeUserProfile(next));
    }

    onFinished();
  }

  return (
    <section className="profile-setup">
      <div className="profile-setup-intro">
        <h1 className="profile-setup-title">まず、今のあなたについて少し教えてください。</h1>
        <p className="profile-setup-lead">あとからいつでも変更できます。空のままでも大丈夫です。</p>
      </div>

      <ProfileFields value={profile} onChange={setProfile} mode="setup" />

      <div className="action-row profile-setup-actions">
        <button type="button" className="action-button primary" onClick={() => finish(profile)}>
          この内容ではじめる
        </button>
        <button type="button" className="action-button subtle" onClick={() => finish(createEmptyProfile())}>
          あとで入力する
        </button>
      </div>
    </section>
  );
}
