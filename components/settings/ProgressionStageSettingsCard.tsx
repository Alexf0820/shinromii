"use client";

import { useEffect, useState } from "react";
import { ProgressionStageBadge } from "@/components/ProgressionStageBadge";
import { UiIcon } from "@/components/UiIcon";
import {
  PROGRESSION_STAGES,
  normalizeUserProfile,
  type ProgressionStageId,
  type UserProfile,
} from "@/lib/user-profile";
import {
  STORAGE_UPDATED_EVENT,
  loadShinromiiStorage,
  saveUserProfile,
} from "@/lib/shinromii-storage";

export function ProgressionStageSettingsCard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    function syncProfile() {
      const storage = loadShinromiiStorage();
      setProfile(normalizeUserProfile(storage.profile));
    }

    syncProfile();
    window.addEventListener(STORAGE_UPDATED_EVENT, syncProfile);

    return () => {
      window.removeEventListener(STORAGE_UPDATED_EVENT, syncProfile);
    };
  }, []);

  function handleChange(stage: ProgressionStageId) {
    if (!profile || profile.progressionStage === stage) {
      return;
    }

    const next = normalizeUserProfile({
      ...profile,
      progressionStage: stage,
    });

    setProfile(next);
    saveUserProfile(next);
  }

  return (
    <section className="panel settings-stage-card">
      <div className="settings-status-icon settings-stage-icon" aria-hidden="true">
        <UiIcon name="spark" className="settings-status-glyph" />
      </div>
      <div className="settings-stage-copy">
        <p className="settings-status-label">進路ステージ</p>
        <p className="settings-card-title">今の進路に合わせて表示を切り替える</p>
        <p className="settings-copy">
          高校進学・大学進学に合わせて、表示や色を切り替えます。これまでの記録は消えません。
        </p>
        {profile?.progressionStage ? (
          <ProgressionStageBadge
            stage={profile.progressionStage}
            className="settings-stage-badge"
            showLabelPrefix
          />
        ) : null}
        <div className="choice-chips settings-stage-chips" role="group" aria-label="進路ステージ">
          {PROGRESSION_STAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-chip ${profile?.progressionStage === item.id ? "active" : ""}`}
              onClick={() => handleChange(item.id)}
            >
              {item.emoji} {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
