"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileFields } from "@/components/ProfileFields";
import { loadShinromiiStorage, markResumeSetup, saveUserProfile } from "@/lib/shinromii-storage";
import {
  createEmptyProfile,
  isProfileRegistered,
  labelForAcademicTrack,
  labelForSchoolYear,
  labelsForAdmissionMethods,
  labelsForInterestFields,
  normalizeUserProfile,
  type UserProfile,
} from "@/lib/user-profile";

function displayOrEmpty(value: string) {
  return value.trim() ? value : "未登録";
}

function listOrEmpty(values: string[]) {
  return values.length ? values.join("、") : "未登録";
}

export function ProfileClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(createEmptyProfile);
  const [draft, setDraft] = useState<UserProfile>(createEmptyProfile);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [extraSubjects, setExtraSubjects] = useState<string[]>([]);
  const [confirmResume, setConfirmResume] = useState(false);

  useEffect(() => {
    const storage = loadShinromiiStorage();
    const next = normalizeUserProfile(storage.profile);
    setProfile(next);
    setDraft(next);
    setExtraSubjects(
      Array.from(new Set(storage.gradeRecords.map((record) => record.subject).filter(Boolean))),
    );
    setEditing(!isProfileRegistered(next));
    setReady(true);
  }, []);

  const interestDisplay = useMemo(() => {
    const selected = labelsForInterestFields(profile.interestFields);
    return [...selected, profile.interestNote].filter(Boolean);
  }, [profile.interestFields, profile.interestNote]);

  function handleSave() {
    const next = normalizeUserProfile(draft);
    saveUserProfile(next);
    setProfile(next);
    setDraft(next);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(profile);
    setEditing(false);
  }

  function startResumeSetup() {
    markResumeSetup();
    router.push("/");
  }

  if (!ready) {
    return null;
  }

  return (
    <div className="page-stack compact">
      {editing ? (
        <section className="panel inline-editor-card">
          <ProfileFields
            value={draft}
            onChange={setDraft}
            mode="full"
            extraSubjects={extraSubjects}
          />
          <div className="action-row compact">
            <button type="button" className="action-button primary" onClick={handleSave}>
              保存する
            </button>
            {isProfileRegistered(profile) ? (
              <button type="button" className="action-button" onClick={handleCancel}>
                キャンセル
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="panel profile-summary">
          <div className="profile-summary-head">
            <p className="profile-summary-kicker">登録内容</p>
            <button type="button" className="action-button" onClick={() => setEditing(true)}>
              編集
            </button>
          </div>
          <dl className="profile-list">
            <div>
              <dt>表示名</dt>
              <dd className={profile.displayName ? "" : "is-empty"}>{displayOrEmpty(profile.displayName)}</dd>
            </div>
            <div>
              <dt>学年</dt>
              <dd className={profile.schoolYear ? "" : "is-empty"}>
                {displayOrEmpty(labelForSchoolYear(profile.schoolYear))}
              </dd>
            </div>
            <div>
              <dt>学科 / コース</dt>
              <dd className={profile.course ? "" : "is-empty"}>{displayOrEmpty(profile.course)}</dd>
            </div>
            <div>
              <dt>文理</dt>
              <dd className={profile.academicTrack ? "" : "is-empty"}>
                {displayOrEmpty(labelForAcademicTrack(profile.academicTrack))}
              </dd>
            </div>
            <div>
              <dt>得意科目</dt>
              <dd className={profile.strongSubjects.length ? "" : "is-empty"}>
                {listOrEmpty(profile.strongSubjects)}
              </dd>
            </div>
            <div>
              <dt>苦手科目</dt>
              <dd className={profile.weakSubjects.length ? "" : "is-empty"}>
                {listOrEmpty(profile.weakSubjects)}
              </dd>
            </div>
            <div>
              <dt>興味のある分野</dt>
              <dd className={interestDisplay.length ? "" : "is-empty"}>{listOrEmpty(interestDisplay)}</dd>
            </div>
            <div>
              <dt>将来やってみたいこと</dt>
              <dd className={profile.futureAspiration ? "" : "is-empty"}>
                {displayOrEmpty(profile.futureAspiration)}
              </dd>
            </div>
            <div>
              <dt>希望する入試方式</dt>
              <dd className={profile.admissionMethods.length ? "" : "is-empty"}>
                {listOrEmpty(labelsForAdmissionMethods(profile.admissionMethods))}
              </dd>
            </div>
            <div>
              <dt>自由メモ</dt>
              <dd className={profile.careerMemo ? "" : "is-empty"}>{displayOrEmpty(profile.careerMemo)}</dd>
            </div>
          </dl>
          <p className="field-help">表示名は通常のホームには出ません。</p>
        </section>
      )}

      <section className={`panel profile-resume-card ${confirmResume ? "is-confirming" : ""}`}>
        {confirmResume ? (
          <>
            <p className="profile-resume-title">初期設定をやり直しますか？</p>
            <p className="profile-resume-text">
              登録済みの成績・資格・大学候補・OCなどは削除されません。
              現在の情報を確認・追加しながら、初期設定をもう一度進められます。
            </p>
            <div className="action-row compact">
              <button type="button" className="action-button primary" onClick={startResumeSetup}>
                初期設定をやり直す
              </button>
              <button type="button" className="action-button" onClick={() => setConfirmResume(false)}>
                キャンセル
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="profile-resume-title">初期設定をやり直す</p>
            <p className="profile-resume-text">
              学年や成績・資格・大学・OCを、今の内容を見ながらもう一度確認できます。データは消えません。
            </p>
            <button type="button" className="action-button" onClick={() => setConfirmResume(true)}>
              初期設定をやり直す
            </button>
          </>
        )}
      </section>
    </div>
  );
}
