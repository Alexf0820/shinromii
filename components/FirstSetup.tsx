"use client";

import { useEffect, useState } from "react";
import { GradeRecordForm } from "@/components/grades/GradeRecordForm";
import { QualificationRecordForm } from "@/components/grades/QualificationRecordForm";
import { OpenCampusCreatePanel } from "@/components/open-campus/OpenCampusCreatePanel";
import { UiIcon } from "@/components/UiIcon";
import { UniversitySearchPanel } from "@/components/universities/UniversitySearchPanel";
import type { GradeRecord, QualificationRecord, UniversityCandidate } from "@/data/mockData";
import { buildGradeRecord, createEmptyGradeForm, type GradeFormState } from "@/lib/grade-form";
import {
  buildQualificationRecord,
  createEmptyQualificationForm,
  type QualificationFormState,
} from "@/lib/qualification-form";
import {
  createBlankShinromiiStorage,
  loadShinromiiStorage,
  saveFirstSetupNotebook,
  saveResumedSetupNotebook,
} from "@/lib/shinromii-storage";
import { isSameUniversityFaculty } from "@/lib/university-candidate";
import {
  ACADEMIC_TRACKS,
  PROGRESSION_STAGES,
  SCHOOL_YEARS,
  createEmptyProfile,
  inferProgressionStageFromSchoolYear,
  normalizeUserProfile,
  type UserProfile,
} from "@/lib/user-profile";

type FirstSetupProps = {
  onFinished: () => void;
  /** 管理プレビュー。保存しない。 */
  preview?: boolean;
  /** 既存データを読み、削除せずに同じ5ステップを再実行する。 */
  resume?: boolean;
};

type SetupStep = 1 | 2 | 3 | 4 | 5 | "done";

const STEP_COUNT = 5;

function readExistingNotebook() {
  if (typeof window === "undefined") {
    return null;
  }

  return loadShinromiiStorage();
}

export function FirstSetup({ onFinished, preview = false, resume = false }: FirstSetupProps) {
  const existing = !preview && resume ? readExistingNotebook() : null;
  const [step, setStep] = useState<SetupStep>(1);
  const [profile, setProfile] = useState<UserProfile>(
    () => (existing ? normalizeUserProfile(existing.profile) : createEmptyProfile()),
  );
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>(() => existing?.gradeRecords ?? []);
  const [qualifications, setQualifications] = useState<QualificationRecord[]>(
    () => existing?.qualifications ?? [],
  );
  const [candidates, setCandidates] = useState<UniversityCandidate[]>(
    () => existing?.universityCandidates ?? [],
  );
  const [events, setEvents] = useState(
    () => existing?.openCampusEvents ?? createBlankShinromiiStorage().openCampusEvents,
  );
  const [campusEvaluators, setCampusEvaluators] = useState(
    () => existing?.campusEvaluators ?? createBlankShinromiiStorage().campusEvaluators,
  );
  const [evaluations, setEvaluations] = useState(
    () => existing?.campusEvaluations ?? createBlankShinromiiStorage().campusEvaluations,
  );
  const [gradeForm, setGradeForm] = useState<GradeFormState>(createEmptyGradeForm);
  const [qualificationForm, setQualificationForm] = useState<QualificationFormState>(createEmptyQualificationForm);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [showQualificationForm, setShowQualificationForm] = useState(false);

  useEffect(() => {
    if (preview || !resume) {
      return;
    }

    const storage = loadShinromiiStorage();
    setProfile(normalizeUserProfile(storage.profile));
    setGradeRecords(storage.gradeRecords);
    setQualifications(storage.qualifications);
    setCandidates(storage.universityCandidates);
    setEvents(storage.openCampusEvents);
    setCampusEvaluators(storage.campusEvaluators);
    setEvaluations(storage.campusEvaluations);
  }, [preview, resume]);

  const numericStep = step === "done" ? STEP_COUNT : step;

  function goNext() {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setShowGradeForm(false);
      setStep(3);
      return;
    }
    if (step === 3) {
      setShowQualificationForm(false);
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(5);
      return;
    }
    setStep("done");
  }

  function goBack() {
    if (step === "done") {
      setStep(5);
      return;
    }
    if (step === 1) {
      return;
    }
    setStep((current) => (typeof current === "number" ? ((current - 1) as SetupStep) : current));
  }

  function finish() {
    if (!preview) {
      if (resume) {
        saveResumedSetupNotebook({
          profile: normalizeUserProfile(profile),
          gradeRecords,
          qualifications,
          universityCandidates: candidates,
          openCampusEvents: events,
          campusEvaluators,
          campusEvaluations: evaluations,
        });
      } else {
        saveFirstSetupNotebook({
          ...createBlankShinromiiStorage(),
          profile: normalizeUserProfile(profile),
          gradeRecords,
          qualifications,
          universityCandidates: candidates,
          openCampusEvents: events,
          campusEvaluators,
          campusEvaluations: evaluations,
          setupCompleted: true,
        });
      }
    }

    onFinished();
  }

  function handleSaveGrade() {
    const nextRecord = buildGradeRecord({ form: gradeForm, gradingMethod: "manual" });

    if (!nextRecord) {
      window.alert("科目名を入力してください。");
      return;
    }

    setGradeRecords((current) => [nextRecord, ...current]);
    setGradeForm(createEmptyGradeForm());
    setShowGradeForm(false);
  }

  function handleSaveQualification() {
    const nextRecord = buildQualificationRecord({ form: qualificationForm });

    if (!nextRecord) {
      window.alert("資格名と級・スコアを入力してください。");
      return;
    }

    setQualifications((current) => [nextRecord, ...current]);
    setQualificationForm(createEmptyQualificationForm());
    setShowQualificationForm(false);
  }

  function handleRegisterUniversity(candidate: UniversityCandidate) {
    const duplicate = candidates.some((item) => isSameUniversityFaculty(item, candidate));

    if (duplicate) {
      window.alert("同じ大学・学部はすでに候補にあります。");
      return false;
    }

    setCandidates((current) => [candidate, ...current]);
    return true;
  }

  return (
    <section className="first-setup">
      {step !== "done" ? (
        <div className="first-setup-progress" aria-label={`ステップ ${numericStep} / ${STEP_COUNT}`}>
          <span className="first-setup-progress-count">
            {numericStep} / {STEP_COUNT}
          </span>
          <ol className="first-setup-dots">
            {Array.from({ length: STEP_COUNT }, (_, index) => {
              const current = index + 1;
              return (
                <li
                  key={current}
                  className={current <= numericStep ? "is-done" : ""}
                  aria-current={current === numericStep ? "step" : undefined}
                />
              );
            })}
          </ol>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="first-setup-step">
          <h1 className="first-setup-title">まずは学年だけで大丈夫です。</h1>
          <p className="first-setup-lead">今わかっていることだけ入れて、SHINROMiiを始めましょう。</p>

          <div className="field-block">
            <span className="field-label">現在の学年</span>
            <div className="choice-chips">
              {SCHOOL_YEARS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`choice-chip ${profile.schoolYear === item.id ? "active" : ""}`}
                  onClick={() =>
                    setProfile((current) => ({
                      ...current,
                      schoolYear: item.id,
                      progressionStage:
                        current.progressionStage || inferProgressionStageFromSchoolYear(item.id),
                    }))
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-block">
            <span className="field-label">いま考えている進路</span>
            <div className="choice-chips">
              {PROGRESSION_STAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`choice-chip ${profile.progressionStage === item.id ? "active" : ""}`}
                  onClick={() => setProfile((current) => ({ ...current, progressionStage: item.id }))}
                >
                  {item.emoji} {item.label}
                </button>
              ))}
            </div>
            <span className="field-help">あとから設定でいつでも変更できます。</span>
          </div>

          <div className="field-block">
            <span className="field-label">文系 / 理系（任意）</span>
            <div className="choice-chips">
              {ACADEMIC_TRACKS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`choice-chip ${profile.academicTrack === item.id ? "active" : ""}`}
                  onClick={() =>
                    setProfile((current) => ({
                      ...current,
                      academicTrack: current.academicTrack === item.id ? "" : item.id,
                    }))
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="first-setup-step">
          <h1 className="first-setup-title">今の評定を登録しておく？</h1>
          <p className="first-setup-lead">あとから成績画面でも追加できます。</p>

          {gradeRecords.length > 0 ? (
            <ul className="setup-mini-list">
              {gradeRecords.map((record) => (
                <li key={record.id}>
                  <strong>
                    {record.subject} {record.grade}
                  </strong>
                  <span>
                    {record.schoolYear} {record.term}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {showGradeForm ? (
            <GradeRecordForm
              title="評定を登録"
              description="学年・学期・科目・評定がわかれば十分です"
              form={gradeForm}
              onChange={setGradeForm}
              onSave={handleSaveGrade}
              onCancel={() => {
                setShowGradeForm(false);
                setGradeForm(createEmptyGradeForm());
              }}
              gradingMethod="manual"
            />
          ) : (
            <div className="setup-choice-row">
              <button
                type="button"
                className="setup-choice-button primary"
                onClick={() => {
                  setGradeForm(createEmptyGradeForm());
                  setShowGradeForm(true);
                }}
              >
                登録する
              </button>
              <button type="button" className="setup-choice-button" onClick={goNext}>
                あとで
              </button>
            </div>
          )}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="first-setup-step">
          <h1 className="first-setup-title">持っている資格・検定はある？</h1>
          <p className="first-setup-lead">英検なら CSE や 4技能も残せます。複数件登録できます。</p>

          {qualifications.length > 0 ? (
            <ul className="setup-mini-list">
              {qualifications.map((record) => (
                <li key={record.id}>
                  <strong>
                    {record.name} {record.scoreOrLevel}
                  </strong>
                  <span>{record.status}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {showQualificationForm ? (
            <QualificationRecordForm
              title="資格・検定を登録"
              description="級やスコアがわかれば十分です"
              form={qualificationForm}
              onChange={setQualificationForm}
              onSave={handleSaveQualification}
              onCancel={() => {
                setShowQualificationForm(false);
                setQualificationForm(createEmptyQualificationForm());
              }}
            />
          ) : (
            <div className="setup-choice-row">
              <button
                type="button"
                className="setup-choice-button primary"
                onClick={() => {
                  setQualificationForm(createEmptyQualificationForm());
                  setShowQualificationForm(true);
                }}
              >
                登録する
              </button>
              <button type="button" className="setup-choice-button" onClick={goNext}>
                あとで
              </button>
            </div>
          )}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="first-setup-step">
          <h1 className="first-setup-title">気になる大学はある？</h1>
          <p className="first-setup-lead">大学名で検索できます。学部が決まっていなくても登録できます。</p>

          {candidates.length > 0 ? (
            <ul className="setup-mini-list">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <strong>{candidate.university}</strong>
                  <span>{candidate.faculty.trim() ? candidate.faculty : "まだ決めていない"}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <UniversitySearchPanel onRegister={handleRegisterUniversity} showCancel={false} />
        </div>
      ) : null}

      {step === 5 ? (
        <div className="first-setup-step">
          <h1 className="first-setup-title">OCの予定や、行った大学はある？</h1>
          <p className="first-setup-lead">これから参加も、参加済みも残せます。何も登録せず進めても大丈夫です。</p>
          <OpenCampusCreatePanel
            events={events}
            campusEvaluators={campusEvaluators}
            evaluations={evaluations}
            onEventsChange={setEvents}
            onEvaluationsChange={setEvaluations}
          />
        </div>
      ) : null}

      {step === "done" ? (
        <div className="first-setup-complete">
          <span className="first-setup-complete-icon" aria-hidden="true">
            <UiIcon name="check" className="first-setup-complete-glyph" />
          </span>
          <h1 className="first-setup-title">SHINROMiiの準備ができました。</h1>
          <p className="first-setup-lead">
            登録した情報は、
            <br />
            あとからいつでも追加・変更できます。
          </p>
          <button type="button" className="action-button primary first-setup-cta" onClick={finish}>
            進路ノートをはじめる
          </button>
        </div>
      ) : (
        <>
          <div className="first-setup-privacy">
            <span className="welcome-note-icon" aria-hidden="true">
              <UiIcon name="lock" className="welcome-note-glyph" />
            </span>
            <p>入力した情報は、この端末の中だけに保存されます。</p>
          </div>

          <div className="first-setup-actions">
            {step !== 1 ? (
              <button type="button" className="action-button subtle" onClick={goBack}>
                戻る
              </button>
            ) : (
              <span />
            )}
            <div className="first-setup-actions-main">
              <button type="button" className="action-button subtle" onClick={goNext}>
                スキップ
              </button>
              <button type="button" className="action-button primary" onClick={goNext}>
                次へ
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
